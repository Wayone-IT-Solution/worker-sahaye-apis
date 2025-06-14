import multer from "multer";
import { uploadToS3 } from "../config/s3Uploader";
import { Request, Response, NextFunction } from "express";

const upload = multer({ storage: multer.memoryStorage() }).fields([
  { name: "avatar", maxCount: 1 },
  { name: "license", maxCount: 1 },
  { name: "insurance", maxCount: 1 },
  { name: "registration", maxCount: 1 },
]);

export const s3FileUploadMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  upload(req, res, async function (err) {
    if (err) return next(err);

    const fileGroups = ["avatar", "license", "registration", "insurance"];

    try {
      for (const group of fileGroups) {
        if (req.files && (req.files as any)[group]) {
          const uploaded = await Promise.all(
            (req.files as any)[group].map(async (file: Express.Multer.File) => {
              const url = await uploadToS3(
                file.buffer,
                file.originalname,
                "riders"
              );
              return {
                url,
                size: file.size,
                mimetype: file.mimetype,
                originalname: file.originalname,
              };
            })
          );
          (req.files as any)[group] = uploaded;
        }
      }
      next();
    } catch (uploadError) {
      next(uploadError);
    }
  });
};
