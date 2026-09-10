import { OverlayEffect, SlideEffect } from '@prisma/client';
import { IsEnum, IsHexColor, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

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
  @IsInt()
  @Min(100)
  @Max(5000)
  entranceDurationMs?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  exitDurationMs?: number;

  @IsOptional()
  @IsEnum(OverlayEffect)
  overlayEffect?: OverlayEffect;

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
  @IsInt()
  @Min(100)
  @Max(5000)
  entranceDurationMs?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  exitDurationMs?: number;

  @IsOptional()
  @IsEnum(OverlayEffect)
  overlayEffect?: OverlayEffect;

  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;
}
