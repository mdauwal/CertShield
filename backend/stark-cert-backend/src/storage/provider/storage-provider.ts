/* eslint-disable prettier/prettier */
// src/modules/storage/providers/s3-storage.provider.ts
import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import {
  IStorageProvider,
  StoredFile,
} from '../interfaces/storage-provider.interface';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private s3 = new S3({ region: process.env.AWS_REGION });

  async uploadFile(
    file: Express.Multer.File,
    folder = 'uploads',
  ): Promise<StoredFile> {
    const ext = path.extname(file.originalname);
    const key = `${folder}/${uuidv4()}${ext}`;

    await this.s3
      .putObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();

    return {
      url: this.generatePublicUrl(key),
      key,
      size: file.size,
    };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3
      .deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      })
      .promise();
  }

  generatePublicUrl(key: string): string {
    return `https://${process.env.CDN_DOMAIN}/${key}`;
  }
}
