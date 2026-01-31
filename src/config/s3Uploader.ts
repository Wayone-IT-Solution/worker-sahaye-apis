import path from "path";
import { v4 as uuid } from "uuid";
import { config } from "../config/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3 =
  config.s3.enabled &&
  new S3Client({
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
    },
  });

const getS3BaseUrl = () => {
  if (config.s3.baseUrl) return config.s3.baseUrl.replace(/\/+$/, "");
  return `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com`;
};

/**
 * Upload a file buffer to AWS S3 and return the public URL
 */
export const uploadToS3 = async (
  fileBuffer: Buffer,
  originalname: string,
  folder: string,
): Promise<string> => {
  if (!config.s3.enabled || !s3) {
    throw new Error("S3 is disabled or not configured correctly.");
  }

  const ext = path.extname(originalname).toLowerCase() || ".bin";
  const contentType = getContentType(ext);
  const key = `${folder}/${uuid()}${ext}`;

  const params = {
    Key: key,
    Body: fileBuffer,
    Bucket: config.s3.bucket,
    ContentType: contentType,
  };

  await s3.send(new PutObjectCommand(params));
  const location = `${getS3BaseUrl()}/${key}`;

  if (config.env !== "production")
    console.log(`✅ Uploaded to S3 → ${location}`);
  return location;
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
    console.warn("S3 is disabled or not configured. Skipping deletion.");
    return;
  }

  const params = { Bucket: config.s3.bucket, Key: key };

  try {
    await s3.send(new DeleteObjectCommand(params));
    console.log(`✅ Deleted from S3: ${key}`);
  } catch (err: any) {
    console.log(`⚠️ Failed to delete from S3: ${key}`, err.message);
  }
};
