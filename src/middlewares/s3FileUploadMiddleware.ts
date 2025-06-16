import multer from "multer";
import { uploadToS3 } from "../config/s3Uploader";
import { Request, Response, NextFunction } from "express";

const memoryStorage = multer.memoryStorage();

export const dynamicUpload = (fields: { name: string; maxCount?: number }[]) =>
  multer({ storage: memoryStorage }).fields(fields);

export const s3UploaderMiddleware = (folder: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;

      for (const fieldName in files) {
        const uploads = await Promise.all(
          files[fieldName].map(async (file) => {
            const url = await uploadToS3(
              file.buffer,
              file.originalname,
              folder
            );
            return {
              url,
              size: file.size,
              mimetype: file.mimetype,
              originalname: file.originalname,
            };
          })
        );
        req.body[fieldName] = uploads;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
