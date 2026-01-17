import { Schema, model, Document, Types } from "mongoose";

export type UserType = "worker" | "contractor" | "employer";
export type BannerType = "job" | "community" | "other";

export interface IBanner extends Document {
  title: string;
  order: number;
  image: string;
  description?: string;
  userType: UserType;
  isActive: string;
  bannerType: BannerType;

  job?: Types.ObjectId;
  community?: Types.ObjectId;
  othersUrl?: string;

  ctaButtonText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    description: { type: String },
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    order: { type: Number, default: 0, required: true },
    userType: {
      type: String,
      enum: ["worker", "contractor", "employer"],
      description: { type: String, required: true },
      required: true,
    },
    isActive: { type: String, default: "active" },

    bannerType: {
      type: String,
      enum: ["job", "community", "other"],
      required: true,
    },

    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: function () {
        return this.bannerType === "job";
      },
    },

    community: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      required: function () {
        return this.bannerType === "community";
      },
    },

    othersUrl: {
      type: String,
      required: function () {
        return this.bannerType === "other";
      },
    },

    ctaButtonText: { type: String },
  },
  { timestamps: true }
);

// Enforce only one target field
bannerSchema.pre("validate", function (next) {
  if (this.bannerType === "job") {
    this.community = undefined;
    this.othersUrl = undefined;
  } else if (this.bannerType === "community") {
    this.job = undefined;
    this.othersUrl = undefined;
  } else if (this.bannerType === "other") {
    this.job = undefined;
    this.community = undefined;
  }
  next();
});

const BannerModel = model<IBanner>("Banner", bannerSchema);
export default BannerModel;
