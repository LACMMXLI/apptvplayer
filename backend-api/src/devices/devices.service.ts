import { Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { hashDeviceKey } from '../device-auth/device-auth.service';
import { AssignPlaylistDto, LinkDeviceDto, UpdateDeviceDto } from './dto/device.dto';

const pairingCodeAlphabet = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

// How long an unclaimed pairing code stays valid.
const PAIRING_CODE_TTL_MS = 24 * 60 * 60 * 1000;

/** Strips the device secret so it never leaves the backend in an API response. */
function withoutKey<T extends { deviceKey: string }>(device: T): Omit<T, 'deviceKey'> {
  const { deviceKey: _deviceKey, ...rest } = device;
  return rest;
}

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  private pairingCutoff() {
    return new Date(Date.now() - PAIRING_CODE_TTL_MS);
  }

  async findAll() {
    const devices = await this.prisma.device.findMany({
      include: { branch: true, playlist: true },
      orderBy: { createdAt: 'desc' },
    });
    return devices.map(withoutKey);
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { branch: true, playlist: true },
    });
    if (!device) throw new NotFoundException('Device not found');
    return withoutKey(device);
  }

  /** Called by the player app on first boot to register itself and obtain a pairing code. */
  async startPairing() {
    // Opportunistic cleanup: drop devices that requested a code but were never
    // claimed. A TV still showing an expired code gets a 401 on its next status
    // poll and automatically re-pairs with a fresh code.
    await this.prisma.device.deleteMany({
      where: { status: 'PENDING', createdAt: { lt: this.pairingCutoff() } },
    });

    const pairingCode = pairingCodeAlphabet();
    const deviceKey = randomUUID();

    const device = await this.prisma.device.create({
      data: {
        name: 'Unnamed device',
        pairingCode,
        // Only a hash is stored. This response is the single time the
        // plaintext key exists outside the player.
        deviceKey: hashDeviceKey(deviceKey),
        status: 'PENDING',
      },
    });

    return { deviceId: device.id, pairingCode: device.pairingCode, deviceKey };
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
    // A code is single-use (only PENDING devices can be claimed) and expires.
    if (!device || device.status !== 'PENDING' || device.createdAt < this.pairingCutoff()) {
      throw new NotFoundException('Código de vinculación inválido o expirado');
    }

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
    return withoutKey(updated);
  }

  async update(id: string, dto: UpdateDeviceDto) {
    await this.findOne(id);
    return withoutKey(await this.prisma.device.update({ where: { id }, data: dto }));
  }

  async assignPlaylist(id: string, dto: AssignPlaylistDto) {
    await this.findOne(id);
    const updated = await this.prisma.device.update({
      where: { id },
      data: { playlistId: dto.playlistId ?? null },
    });
    this.realtime.notifyPlaylistUpdate(id, updated.playlistId);
    return withoutKey(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    return withoutKey(await this.prisma.device.delete({ where: { id } }));
  }

  async heartbeat(id: string) {
    await this.prisma.device.update({
      where: { id },
      data: { lastSeenAt: new Date(), status: 'ONLINE' },
    });
    return { ok: true };
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
