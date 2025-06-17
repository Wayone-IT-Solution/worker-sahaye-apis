import path from "path";
import AWS from "aws-sdk";
import { v4 as uuid } from "uuid";
import { config } from "../config/config";

const s3 =
  config.s3.enabled &&
  new AWS.S3({
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  });

/**
 * Upload a file buffer to AWS S3 and return the public URL
 */
export const uploadToS3 = async (
  fileBuffer: Buffer,
  originalname: string,
  folder: string
): Promise<string> => {
  if (!config.s3.enabled || !s3) {
    throw new Error("S3 is disabled or not configured correctly.");
  }

  const ext = path.extname(originalname).toLowerCase() || ".bin";
  const contentType = getContentType(ext);
  const key = `${folder}/${uuid()}${ext}`;

  const params: AWS.S3.PutObjectRequest = {
    Key: key,
    Body: fileBuffer,
    Bucket: config.s3.bucket,
    ContentType: contentType,
  };

  const { Location } = await s3.upload(params).promise();

  if (process.env.NODE_ENV !== "production")
    console.log(`✅ Uploaded to S3 → ${Location}`);
  return Location;
};

/**
 * Map file extension to content type
 */
const getContentType = (ext: string): string => {
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] || "application/octet-stream";
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  if (!config.s3.enabled || !s3) {
    throw new Error("S3 is disabled or not configured.");
  }
  const params = { Bucket: config.s3.bucket, Key: key };
  await s3.deleteObject(params).promise();
};
