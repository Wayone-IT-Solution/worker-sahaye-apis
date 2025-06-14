import path from "path";
import AWS from "aws-sdk";
import { v4 as uuid } from "uuid";

// Setup AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
});

export const uploadToS3 = async (
  fileBuffer: Buffer,
  originalname: string,
  folder: string
): Promise<string> => {
  const ext = path.extname(originalname);
  const key = `${folder}/${uuid()}${ext}`;

  const params = {
    Key: key,
    Body: fileBuffer,
    ACL: "public-read",
    ContentType: getContentType(ext),
    Bucket: process.env.AWS_BUCKET_NAME!,
  };

  const upload = await s3.upload(params).promise();
  return upload.Location; // S3 public URL
};

const getContentType = (ext: string): string => {
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
};
