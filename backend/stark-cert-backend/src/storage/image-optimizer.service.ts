/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';

@Injectable()
export class ImageOptimizerService {
  async optimize(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).resize(1024).jpeg({ quality: 80 }).toBuffer();
  }
}
