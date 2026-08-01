import { Module } from '@nestjs/common';
import { SlidesService } from './slides.service';
import { SlidesController } from './slides.controller';

@Module({
  providers: [SlidesService],
  controllers: [SlidesController],
})
export class SlidesModule {}
