import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DeviceKeyGuard } from './device-key.guard';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  providers: [DevicesService, DeviceKeyGuard],
  controllers: [DevicesController],
})
export class DevicesModule {}
