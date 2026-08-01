import { Injectable, NotFoundException } from '@nestjs/common';
import { MediaType } from '@prisma/client';
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
    const { bucket, objectKey, url } = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    const type: MediaType = file.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE';

    return this.prisma.mediaFile.create({
      data: {
        fileName: objectKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        type,
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
