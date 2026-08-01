import { SlideEffect } from '@prisma/client';
import { IsEnum, IsHexColor, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateSlideDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSecs?: number;

  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsOptional()
  @IsEnum(SlideEffect)
  entranceEffect?: SlideEffect;

  @IsOptional()
  @IsEnum(SlideEffect)
  exitEffect?: SlideEffect;

  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;
}

export class UpdateSlideDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSecs?: number;

  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsOptional()
  @IsEnum(SlideEffect)
  entranceEffect?: SlideEffect;

  @IsOptional()
  @IsEnum(SlideEffect)
  exitEffect?: SlideEffect;

  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;
}
