import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeviceKeyGuard } from './device-key.guard';
import { DevicesService } from './devices.service';
import { AssignPlaylistDto, LinkDeviceDto, UpdateDeviceDto } from './dto/device.dto';

@Controller('devices')
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  // ---- Player-facing endpoints ----

  @Post('pairing/start')
  startPairing() {
    return this.devicesService.startPairing();
  }

  @UseGuards(DeviceKeyGuard)
  @Get(':id/status')
  pairingStatus(@Param('id') id: string) {
    return this.devicesService.pairingStatus(id);
  }

  @UseGuards(DeviceKeyGuard)
  @Post(':id/heartbeat')
  heartbeat(@Param('id') id: string) {
    return this.devicesService.heartbeat(id);
  }

  @UseGuards(DeviceKeyGuard)
  @Get(':id/playlist')
  getPlaylist(@Param('id') id: string) {
    return this.devicesService.getPlaylistForDevice(id);
  }

  // ---- Admin-facing endpoints ----

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.devicesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/:id')
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('link/:pairingCode')
  link(@Param('pairingCode') pairingCode: string, @Body() dto: LinkDeviceDto) {
    return this.devicesService.link(pairingCode, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.devicesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/:id/playlist')
  assignPlaylist(@Param('id') id: string, @Body() dto: AssignPlaylistDto) {
    return this.devicesService.assignPlaylist(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }
}
