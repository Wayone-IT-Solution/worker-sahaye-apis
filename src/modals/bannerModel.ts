import mongoose, { Schema, Document } from "mongoose";

/**
 * Enum for banner visibility status
 */
export enum BannerStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

/**
 * Banner Document Interface
 */
export interface IBanner extends Document {
  title: string;
  link?: string;
  pageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  fileUrl: string;
  description?: string;
  status: BannerStatus;
}

/**
 * Mongoose Schema for Banner
 */
const bannerSchema: Schema<IBanner> = new Schema<IBanner>(
  {
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(BannerStatus),
      default: BannerStatus.ACTIVE,
    },
    pageUrl: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  },
);

const Banner = mongoose.model<IBanner>("Banner", bannerSchema);

export default Banner;
