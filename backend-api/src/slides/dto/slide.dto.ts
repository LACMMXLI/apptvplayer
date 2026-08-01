import { IsHexColor, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

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
  @IsObject()
  layout?: Record<string, unknown>;
}
