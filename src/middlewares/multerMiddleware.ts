import multer from "multer";
import { Request, Response, NextFunction } from "express";
import path from "path";

// Use memoryStorage to avoid saving files
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  fileFilter: (_req, file, cb) => {
    // Accept all file types; can customize if needed
    cb(null, true);
  },
}).fields([
  { name: "license", maxCount: 1 },
  { name: "avatarUrl", maxCount: 1 },
  { name: "adhaarCard", maxCount: 1 },
]);

// Middleware to mock file paths (simulate saved files)
export const virtualFilePathMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  upload(req, res, function (err) {
    if (err) return next(err);

    const fileGroups = ["avatarUrl", "license", "adhaarCard"];
    const baseUrl = "/uploads"; // Simulate a static uploads path

    fileGroups.forEach((group) => {
      if (req.files && (req.files as any)[group]) {
        (req.files as any)[group] = (req.files as any)[group].map(
          (file: Express.Multer.File) => {
            const fakePath =
              baseUrl +
              "/" +
              `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
                file.originalname
              )}`;

            return {
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              buffer: file.buffer,
              path: fakePath, // Add virtual path
            };
          }
        );
      }
    });

    next();
  });
};
