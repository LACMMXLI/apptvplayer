import { Injectable } from '@nestjs/common';
import { Device } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const HASH_PREFIX = 'sha256:';

/**
 * Device keys are long random tokens (UUIDv4), so a fast unsalted SHA-256 is
 * sufficient: there is nothing to brute-force, the goal is only that a leaked
 * database or API response can't be replayed as a working credential.
 */
export function hashDeviceKey(deviceKey: string): string {
  return HASH_PREFIX + createHash('sha256').update(deviceKey).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

@Injectable()
export class DeviceAuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns the device when `deviceKey` is its valid secret, otherwise null.
   * Used by both the HTTP guard and the WebSocket gateway.
   */
  async authenticate(deviceId: unknown, deviceKey: unknown): Promise<Device | null> {
    if (typeof deviceId !== 'string' || typeof deviceKey !== 'string') return null;
    if (!deviceId || !deviceKey || deviceId.length > 100 || deviceKey.length > 200) return null;

    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return null;

    if (device.deviceKey.startsWith(HASH_PREFIX)) {
      return safeEqual(device.deviceKey, hashDeviceKey(deviceKey)) ? device : null;
    }

    // Legacy row created before keys were hashed: verify against the stored
    // plaintext, then upgrade it in place so it is never kept in clear again.
    if (!safeEqual(device.deviceKey, deviceKey)) return null;
    await this.prisma.device
      .update({ where: { id: device.id }, data: { deviceKey: hashDeviceKey(deviceKey) } })
      .catch(() => undefined);
    return device;
  }
}
