//create-certificate.dto.ts
import { IsString, IsUUID, IsEmail, IsOptional, IsDateString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCertificateDto {
  @ApiProperty({ example: 'Web Development Certificate' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'This certificate is awarded for completing the Web Development Course' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'ABC Institute' })
  @IsString()
  issuerName: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  recipientName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  recipientEmail: string;

  @ApiProperty({ example: '2023-01-01' })
  @IsDateString()
  issueDate: Date;

  @ApiProperty({ example: '2025-01-01', required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: Date;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  issuerId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}