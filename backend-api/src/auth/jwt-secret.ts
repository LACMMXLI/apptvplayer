import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRETS = new Set(['change-me', 'change-me-in-production', 'secret', 'jwt-secret']);
const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';

/**
 * Resolves the JWT signing secret. In production a missing, placeholder or
 * short secret aborts startup: with a guessable secret anyone can forge an
 * admin token. Outside production it only warns, so local dev keeps working.
 */
export function resolveJwtSecret(config: ConfigService): string {
  const secret = (config.get<string>('JWT_SECRET') ?? '').trim();
  const weak =
    secret.length < MIN_SECRET_LENGTH || PLACEHOLDER_SECRETS.has(secret.toLowerCase());

  if (!weak) return secret;

  const problem = secret
    ? `JWT_SECRET is too weak (placeholder value or shorter than ${MIN_SECRET_LENGTH} characters)`
    : 'JWT_SECRET is not set';

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${problem}. Refusing to start. Generate one with: ` +
        `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`,
    );
  }

  new Logger('Auth').warn(`${problem}. Using an insecure value — acceptable for local development only.`);
  return secret || DEV_FALLBACK_SECRET;
}
