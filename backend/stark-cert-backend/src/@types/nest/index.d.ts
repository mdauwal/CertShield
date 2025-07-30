/* eslint-disable prettier/prettier */
import { File as MulterFile } from 'multer';

declare global {
  namespace Express {
    interface Request {
      file?: MulterFile;
      files?: MulterFile[];
    }
  }
}
