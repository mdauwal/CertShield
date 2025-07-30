/* eslint-disable prettier/prettier */
// src/modules/storage/interfaces/storage-provider.interface.ts
export interface StoredFile {
  url: string;
  key: string;
  size: number;
  version?: string;
}

export interface IStorageProvider {
  uploadFile(file: Express.Multer.File, folder?: string): Promise<StoredFile>;
  deleteFile(key: string): Promise<void>;
  generatePublicUrl(key: string): string;
}
