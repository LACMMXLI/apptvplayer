import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { DeviceAuthService } from '../device-auth/device-auth.service';

/**
 * Authenticates player requests using the long-lived device key issued
 * at pairing time (header `x-device-key`), scoped to the :id route param.
 */
@Injectable()
export class DeviceKeyGuard implements CanActivate {
  constructor(private deviceAuth: DeviceAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const deviceId = req.params.id;
    const deviceKey = req.headers['x-device-key'];

    if (!deviceId || !deviceKey) {
      throw new UnauthorizedException('Missing device credentials');
    }

    const device = await this.deviceAuth.authenticate(deviceId, deviceKey);
    if (!device) {
      throw new UnauthorizedException('Invalid device credentials');
    }

    req.device = device;
    return true;
  }
}
