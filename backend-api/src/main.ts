import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

/**
 * Browser origins allowed to call the API. In production an unset
 * CORS_ORIGINS means "no cross-origin access" rather than "everyone", so a
 * forgotten env var fails closed. In development any origin is allowed.
 */
function resolveCorsOrigin(): string[] | boolean {
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length > 0 && !origins.includes('*')) return origins;

  if (process.env.NODE_ENV === 'production') {
    new Logger('CORS').warn(
      'CORS_ORIGINS is not set to an explicit list — cross-origin requests are blocked. ' +
        'Set it to the admin and player URLs, comma separated.',
    );
    return false;
  }
  return true;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Rate limiting keys on the client IP. Behind a reverse proxy (Coolify /
  // Traefik) that is only correct if Express trusts the proxy's
  // X-Forwarded-For; set TRUST_PROXY to the number of proxy hops (usually 1).
  // Left off by default so a directly exposed server can't be fooled by a
  // spoofed header.
  const trustProxy = parseInt(process.env.TRUST_PROXY ?? '', 10);
  if (trustProxy > 0) app.set('trust proxy', trustProxy);

  // Standard security headers. The API only serves JSON to other origins
  // (admin + player), so its responses must stay readable cross-origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Auth uses Bearer tokens / x-device-key headers, never cookies, so
  // credentialed CORS is not needed.
  app.enableCors({
    origin: resolveCorsOrigin(),
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-key'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 600,
  });

  if (process.env.REDIS_URL) {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis(process.env.REDIS_URL);
    app.useWebSocketAdapter(redisIoAdapter);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`backend-api listening on port ${port}`);
}
bootstrap();
