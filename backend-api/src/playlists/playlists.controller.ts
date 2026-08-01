import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto, ReorderPlaylistItemsDto, UpdatePlaylistDto } from './dto/playlist.dto';

@UseGuards(JwtAuthGuard)
@Controller('playlists')
export class PlaylistsController {
  constructor(private playlistsService: PlaylistsService) {}

  @Get()
  findAll() {
    return this.playlistsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playlistsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePlaylistDto) {
    return this.playlistsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlaylistDto) {
    return this.playlistsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.playlistsService.remove(id);
  }

  @Post(':id/items/:slideId')
  addSlide(@Param('id') id: string, @Param('slideId') slideId: string) {
    return this.playlistsService.addSlide(id, slideId);
  }

  @Delete(':id/items/:itemId')
  removeSlide(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.playlistsService.removeSlide(id, itemId);
  }

  @Patch(':id/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderPlaylistItemsDto) {
    return this.playlistsService.reorder(id, dto);
  }
}
