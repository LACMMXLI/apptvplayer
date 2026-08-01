import { IsOptional, IsString } from 'class-validator';

export class LinkDeviceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class AssignPlaylistDto {
  @IsOptional()
  @IsString()
  playlistId?: string | null;
}

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
