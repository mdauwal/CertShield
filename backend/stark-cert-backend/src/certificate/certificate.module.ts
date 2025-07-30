import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { Certificate } from './entities/certificate.entity'; 
import { UsersModule } from '../users/users.module'; 
import { TemplatesModule } from '../templates/templates.module'; 
import { BlockchainModule } from '../blockchain/blockchain.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate]),
    UsersModule, 
    TemplatesModule,
    BlockchainModule,
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
