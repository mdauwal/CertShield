import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateCertificateDto } from './create-certificate.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { CertificateStatus } from '../enums/certificate-status.enum';


export class UpdateCertificateDto extends PartialType(CreateCertificateDto) {
  @ApiProperty({ enum: CertificateStatus, required: false })
  @IsOptional()
  @IsEnum(CertificateStatus)
  status?: CertificateStatus;
}