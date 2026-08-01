import { Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AssignPlaylistDto, LinkDeviceDto, UpdateDeviceDto } from './dto/device.dto';

const pairingCodeAlphabet = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  findAll() {
    return this.prisma.device.findMany({
      include: { branch: true, playlist: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { branch: true, playlist: true },
    });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  /** Called by the player app on first boot to register itself and obtain a pairing code. */
  async startPairing() {
    const pairingCode = pairingCodeAlphabet();
    const deviceKey = randomUUID();

    const device = await this.prisma.device.create({
      data: {
        name: 'Unnamed device',
        pairingCode,
        deviceKey,
        status: 'PENDING',
      },
    });

    return { deviceId: device.id, pairingCode: device.pairingCode, deviceKey: device.deviceKey };
  }

  /** Called by the player app while it waits on the pairing screen (device already authenticated by guard). */
  async pairingStatus(id: string) {
    const device = await this.findOne(id);
    return {
      status: device.status,
      name: device.name,
      playlistId: device.playlistId,
    };
  }

  /** Called by an admin to claim a pending device using its pairing code. */
  async link(pairingCode: string, dto: LinkDeviceDto) {
    const device = await this.prisma.device.findUnique({ where: { pairingCode } });
    if (!device) throw new NotFoundException('Invalid pairing code');

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: {
        name: dto.name,
        branchId: dto.branchId,
        status: 'ONLINE',
        pairedAt: new Date(),
      },
    });

    this.realtime.forceReload(updated.id);
    return updated;
  }

  async update(id: string, dto: UpdateDeviceDto) {
    await this.findOne(id);
    return this.prisma.device.update({ where: { id }, data: dto });
  }

  async assignPlaylist(id: string, dto: AssignPlaylistDto) {
    await this.findOne(id);
    const updated = await this.prisma.device.update({
      where: { id },
      data: { playlistId: dto.playlistId ?? null },
    });
    this.realtime.notifyPlaylistUpdate(id, updated.playlistId);
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.device.delete({ where: { id } });
  }

  async heartbeat(id: string) {
    return this.prisma.device.update({
      where: { id },
      data: { lastSeenAt: new Date(), status: 'ONLINE' },
    });
  }

  async getPlaylistForDevice(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        playlist: {
          include: {
            items: {
              include: { slide: { include: { media: true } } },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
    if (!device) throw new NotFoundException('Device not found');
    return device.playlist;
  }
}
