import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Authenticates player requests using the long-lived device key issued
 * at pairing time (header `x-device-key`), scoped to the :id route param.
 */
@Injectable()
export class DeviceKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const deviceId = req.params.id;
    const deviceKey = req.headers['x-device-key'];

    if (!deviceId || !deviceKey) {
      throw new UnauthorizedException('Missing device credentials');
    }

    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device || device.deviceKey !== deviceKey) {
      throw new UnauthorizedException('Invalid device credentials');
    }

    req.device = device;
    return true;
  }
}
