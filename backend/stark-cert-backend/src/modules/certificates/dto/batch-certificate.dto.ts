import { IsArray, IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCertificateDto } from './create-certificate.dto';

export class BatchCertificateDto {
  @ApiProperty({ type: [CreateCertificateDto], description: 'Array of certificates to process' })
  @IsArray()
  certificates: CreateCertificateDto[];

  @ApiPropertyOptional({ description: 'Batch ID for tracking' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ description: 'Batch metadata' })
  @IsOptional()
  @IsObject()
  batchMetadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template ID for batch processing' })
  @IsOptional()
  @IsUUID()
  templateId?: string;
}

export class BatchCertificateResponseDto {
  @ApiProperty({ description: 'Batch ID' })
  batchId: string;

  @ApiProperty({ description: 'Total certificates in batch' })
  totalCertificates: number;

  @ApiProperty({ description: 'Successfully processed certificates' })
  successfulCertificates: number;

  @ApiProperty({ description: 'Failed certificates' })
  failedCertificates: number;

  @ApiProperty({ type: [String], description: 'Array of certificate IDs' })
  certificateIds: string[];

  @ApiProperty({ type: [Object], description: 'Array of errors if any' })
  errors: any[];
} 