import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MediaModule } from './media/media.module';
import { SlidesModule } from './slides/slides.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { DevicesModule } from './devices/devices.module';
import { BranchesModule } from './branches/branches.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Not applied globally (players poll/heartbeat constantly and many TVs can
    // share one public IP). Routes opt in with ThrottlerGuard + @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    RealtimeModule,
    AuthModule,
    MediaModule,
    SlidesModule,
    PlaylistsModule,
    DevicesModule,
    BranchesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
