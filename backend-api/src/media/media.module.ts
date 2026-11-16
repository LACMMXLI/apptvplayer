import { BadRequestException, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { StorageModule } from '../storage/storage.module';
import { ALLOWED_MIME_TYPES, DEFAULT_MAX_UPLOAD_MB } from './media-validation';

@Module({
  imports: [
    StorageModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const maxMb = Number(config.get<string>('MAX_UPLOAD_MB')) || DEFAULT_MAX_UPLOAD_MB;
        return {
          // Uploads are buffered in memory, so the size cap also bounds RAM use.
          limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
          // Cheap early rejection on the declared type; the real format is
          // verified from the file bytes in MediaService.
          fileFilter: (
            _req: unknown,
            file: { mimetype: string },
            cb: (error: Error | null, acceptFile: boolean) => void,
          ) => {
            if (ALLOWED_MIME_TYPES.has(file.mimetype)) return cb(null, true);
            cb(
              new BadRequestException(
                'Tipo de archivo no permitido. Usa JPG, PNG, GIF, WEBP, MP4 o WEBM.',
              ),
              false,
            );
          },
        };
      },
    }),
  ],
  providers: [MediaService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
