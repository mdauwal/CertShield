/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ImageOptimizerService } from './image-optimizer.service';
import { StorageController } from './storage.controller';
import { S3StorageProvider } from './provider/storage-provider';

@Module({
  controllers: [StorageController],
  providers: [
    StorageService,
    ImageOptimizerService,
    {
      provide: 'IStorageProvider',
      useClass: S3StorageProvider,
    },
  ],
})
export class StorageModule {}
