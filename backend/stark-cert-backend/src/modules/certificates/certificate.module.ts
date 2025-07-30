import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './services/certificate.service';
import { BlockchainService } from './services/blockchain.service';
import { Certificate } from './entities/certificate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate]),
  ],
  controllers: [CertificateController],
  providers: [
    CertificateService,
    BlockchainService,
  ],
  exports: [
    CertificateService,
    BlockchainService,
  ],
})
export class CertificateModule {} 