import { Schema, model, Document } from "mongoose";

export type UserType = "worker" | "contractor" | "employer";

export interface IBanner extends Document {
  title: string;
  order: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: string;
  userType: UserType;
  description: string;
}

const bannerSchema = new Schema<IBanner>(
  {
    description: { type: String },
    title: { type: String, required: true },
    image: { type: String, required: true },
    order: { type: Number, required: true, default: 0 },
    userType: {
      type: String,
      enum: ["worker", "contractor", "employer"],
      description: { type: String, required: true },
      required: true,
    },
    isActive: { type: String, default: "active" },
  },
  { timestamps: true }
);

const BannerModel = model<IBanner>("Banner", bannerSchema);
export default BannerModel;
