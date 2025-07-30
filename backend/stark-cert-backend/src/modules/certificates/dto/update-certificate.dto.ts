import { PartialType } from '@nestjs/mapped-types';
import { CreateCertificateDto } from './create-certificate.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CertificateStatus } from '../enums/certificate-status.enum';

export class UpdateCertificateDto extends PartialType(CreateCertificateDto) {
  @ApiPropertyOptional({ enum: CertificateStatus, description: 'Certificate status' })
  @IsOptional()
  @IsEnum(CertificateStatus)
  status?: CertificateStatus;

  @ApiPropertyOptional({ description: 'Reason for revocation if applicable' })
  @IsOptional()
  @IsString()
  revocationReason?: string;

  @ApiPropertyOptional({ description: 'Blockchain transaction hash' })
  @IsOptional()
  @IsString()
  blockchainTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Blockchain certificate ID' })
  @IsOptional()
  @IsString()
  blockchainCertificateId?: string;

  @ApiPropertyOptional({ description: 'Date when certificate was revoked' })
  @IsOptional()
  revokedAt?: Date;

  @ApiPropertyOptional({ description: 'User who revoked the certificate' })
  @IsOptional()
  @IsString()
  revokedBy?: string;
} 