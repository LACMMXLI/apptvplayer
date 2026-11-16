import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { DeviceAuthModule } from '../device-auth/device-auth.module';

@Module({
  imports: [DeviceAuthModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
