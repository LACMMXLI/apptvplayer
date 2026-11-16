import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { DeviceKeyGuard } from './device-key.guard';
import { DevicesService } from './devices.service';
import { AssignPlaylistDto, LinkDeviceDto, UpdateDeviceDto } from './dto/device.dto';

@Controller('devices')
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  // ---- Player-facing endpoints ----

  // Unauthenticated and creates a DB row per call, so it is rate limited
  // per client IP to stop it being used to flood the devices table.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('link/:pairingCode')
  link(@Param('pairingCode') pairingCode: string, @Body() dto: LinkDeviceDto) {
    return this.devicesService.link(pairingCode, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.devicesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/:id/playlist')
  assignPlaylist(@Param('id') id: string, @Body() dto: AssignPlaylistDto) {
    return this.devicesService.assignPlaylist(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }
}
