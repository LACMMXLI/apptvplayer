import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { detectMedia } from './media-validation';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  findAll() {
    return this.prisma.mediaFile.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const media = await this.prisma.mediaFile.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async upload(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    // Trust the file's actual bytes, not the name/MIME type the client sent.
    const detected = detectMedia(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        'El contenido del archivo no es una imagen o video válido (JPG, PNG, GIF, WEBP, MP4, WEBM).',
      );
    }

    const { bucket, objectKey, url } = await this.storage.upload(
      file.buffer,
      detected.extension,
      detected.mimeType,
    );

    return this.prisma.mediaFile.create({
      data: {
        fileName: objectKey,
        originalName: file.originalname.slice(0, 255),
        mimeType: detected.mimeType,
        type: detected.type,
        sizeBytes: file.size,
        bucket,
        objectKey,
        url,
      },
    });
  }

  async remove(id: string) {
    const media = await this.findOne(id);
    await this.storage.remove(media.objectKey);
    return this.prisma.mediaFile.delete({ where: { id } });
  }
}
