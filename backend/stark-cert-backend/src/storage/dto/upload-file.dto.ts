/* eslint-disable prettier/prettier */
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @IsNotEmpty()
  file: Express.Multer.File;

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsString()
  type?: 'image' | 'document' | 'certificate';
}
