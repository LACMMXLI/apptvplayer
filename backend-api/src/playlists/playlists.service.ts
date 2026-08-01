import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreatePlaylistDto, ReorderPlaylistItemsDto, UpdatePlaylistDto } from './dto/playlist.dto';

@Injectable()
export class PlaylistsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  findAll() {
    return this.prisma.playlist.findMany({
      include: { items: { include: { slide: true }, orderBy: { order: 'asc' } }, branch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: { items: { include: { slide: { include: { media: true } } }, orderBy: { order: 'asc' } } },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');
    return playlist;
  }

  create(dto: CreatePlaylistDto) {
    return this.prisma.playlist.create({ data: dto });
  }

  async update(id: string, dto: UpdatePlaylistDto) {
    await this.findOne(id);
    const playlist = await this.prisma.playlist.update({ where: { id }, data: dto });
    await this.notifyDevices(id);
    return playlist;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.playlist.delete({ where: { id } });
  }

  async addSlide(playlistId: string, slideId: string) {
    await this.findOne(playlistId);
    const count = await this.prisma.playlistItem.count({ where: { playlistId } });
    const item = await this.prisma.playlistItem.create({
      data: { playlistId, slideId, order: count },
    });
    await this.notifyDevices(playlistId);
    return item;
  }

  async removeSlide(playlistId: string, itemId: string) {
    await this.prisma.playlistItem.delete({ where: { id: itemId } });
    await this.notifyDevices(playlistId);
    return { success: true };
  }

  async reorder(playlistId: string, dto: ReorderPlaylistItemsDto) {
    await this.findOne(playlistId);

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.playlistItem.updateMany({
          where: { playlistId, slideId: item.slideId },
          data: { order: item.order },
        }),
      ),
    );

    await this.notifyDevices(playlistId);
    return this.findOne(playlistId);
  }

  private async notifyDevices(playlistId: string) {
    const devices = await this.prisma.device.findMany({
      where: { playlistId },
      select: { id: true },
    });
    this.realtime.notifyPlaylistUpdateForPlaylist(
      devices.map((d) => d.id),
      playlistId,
    );
  }
}
