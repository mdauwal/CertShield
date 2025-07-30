import { IsOptional, IsString, IsEnum, IsDateString, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CertificateStatus } from '../enums/certificate-status.enum';
import { CertificateType } from '../enums/certificate-type.enum';

export class SearchCertificateDto {
  @ApiPropertyOptional({ description: 'Search term for certificate title, description, or recipient name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CertificateStatus, description: 'Filter by certificate status' })
  @IsOptional()
  @IsEnum(CertificateStatus)
  status?: CertificateStatus;

  @ApiPropertyOptional({ enum: CertificateType, description: 'Filter by certificate type' })
  @IsOptional()
  @IsEnum(CertificateType)
  type?: CertificateType;

  @ApiPropertyOptional({ description: 'Filter by issuer ID' })
  @IsOptional()
  @IsUUID()
  issuerId?: string;

  @ApiPropertyOptional({ description: 'Filter by recipient ID' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiPropertyOptional({ description: 'Filter by recipient email' })
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'Filter by template ID' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Filter by issue date from' })
  @IsOptional()
  @IsDateString()
  issueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by issue date to' })
  @IsOptional()
  @IsDateString()
  issueDateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by expiry date from' })
  @IsOptional()
  @IsDateString()
  expiryDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by expiry date to' })
  @IsOptional()
  @IsDateString()
  expiryDateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by blockchain verification status' })
  @IsOptional()
  @IsString()
  blockchainVerified?: string;

  @ApiPropertyOptional({ description: 'Filter by batch ID' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field', example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
} 