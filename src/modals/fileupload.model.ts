import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Enum for classifying uploaded files by type/tag
 */
export enum FileTag {
  OTHER = "other",
  RESUME = "resume",
  ID_PROOF = "company_proof",
  DOCUMENT = "document",
  CONTRACT = "contract",
  CERTIFICATE = "certificate",
  PROFILE_PICTURE = "profilePic",
  PERSONALRESUME = "personalResume",
  GST_CERTIFICATE = "gst_cert",
  IDENTITY_PROOF = "idProof",
}

/**
 * Interface representing a file upload document
 */
export interface IFileUpload extends Document {
  url: string;
  tag: FileTag;
  s3Key: string;
  mimeType?: string;
  uploadedAt?: Date;
  sizeInBytes?: number;
  originalName?: string;
  userId: mongoose.Types.ObjectId;
}

const FileUploadSchema: Schema<IFileUpload> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    tag: {
      type: String,
      enum: Object.values(FileTag),
      required: true,
      index: true,
    },
    s3Key: {
      type: String,
      required: true,
      unique: true,
    },
    url: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
    },
    mimeType: {
      type: String,
    },
    sizeInBytes: {
      type: Number,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

FileUploadSchema.index({ userId: 1, tag: 1 }); // Compound index for user + tag combo

const FileUpload: Model<IFileUpload> = mongoose.model<IFileUpload>(
  "FileUpload",
  FileUploadSchema
);

export default FileUpload;
