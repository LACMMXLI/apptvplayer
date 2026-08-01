import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlideDto, UpdateSlideDto } from './dto/slide.dto';

@Injectable()
export class SlidesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.slide.findMany({
      include: { media: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const slide = await this.prisma.slide.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!slide) throw new NotFoundException('Slide not found');
    return slide;
  }

  create(dto: CreateSlideDto) {
    return this.prisma.slide.create({ data: dto as any });
  }

  async update(id: string, dto: UpdateSlideDto) {
    await this.findOne(id);
    return this.prisma.slide.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.slide.delete({ where: { id } });
  }
}
