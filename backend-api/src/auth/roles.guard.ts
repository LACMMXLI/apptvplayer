import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

const ROLES_KEY = 'roles';

/**
 * Restricts a route (or a whole controller) to the given roles. Must be used
 * together with `@UseGuards(JwtAuthGuard, RolesGuard)` — JwtAuthGuard first,
 * since it is what populates `req.user`.
 *
 * Policy: EDITOR manages content (media, slides, playlists, and which
 * playlist a screen shows); ADMIN additionally manages screens and branches.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const role = context.switchToHttp().getRequest().user?.role;
    if (!required.includes(role)) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }
    return true;
  }
}
