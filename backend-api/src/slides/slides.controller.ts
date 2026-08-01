import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SlidesService } from './slides.service';
import { CreateSlideDto, UpdateSlideDto } from './dto/slide.dto';

@UseGuards(JwtAuthGuard)
@Controller('slides')
export class SlidesController {
  constructor(private slidesService: SlidesService) {}

  @Get()
  findAll() {
    return this.slidesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.slidesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSlideDto) {
    return this.slidesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSlideDto) {
    return this.slidesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.slidesService.remove(id);
  }
}
