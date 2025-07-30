/* eslint-disable prettier/prettier */
// src/modules/storage/services/storage.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { IStorageProvider } from './interfaces/storage-provider.interface';
import { ImageOptimizerService } from './image-optimizer.service';

@Injectable()
export class StorageService {
  constructor(
    private readonly storageProvider: IStorageProvider,
    private readonly imageOptimizer: ImageOptimizerService,
  ) {}

  async upload(file: Express.Multer.File, folder?: string) {
    if (!file) throw new BadRequestException('File is required');

    let buffer = file.buffer;

    // Limit formats
    const allowedFormats = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedFormats.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file format');
    }

    // Limit size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large');
    }

    // Optimize image
    if (file.mimetype.startsWith('image/')) {
      buffer = await this.imageOptimizer.optimize(buffer);
      file.buffer = buffer;
    }

    return this.storageProvider.uploadFile(file, folder);
  }

  async delete(key: string) {
    return this.storageProvider.deleteFile(key);
  }
}
