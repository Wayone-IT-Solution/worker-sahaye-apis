import mongoose, { Document, Schema, Model } from "mongoose";

export enum IndustryStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface IIndustry extends Document {
  name: string;
  icon?: string;
  description?: string;
  status: IndustryStatus;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IndustrySchema: Schema<IIndustry> = new Schema(
  {
    icon: { type: String },
    description: { type: String, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      default: IndustryStatus.ACTIVE,
      enum: Object.values(IndustryStatus),
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

IndustrySchema.index({ status: 1 });
IndustrySchema.index({ keywords: 1 });

const Industry: Model<IIndustry> = mongoose.model<IIndustry>(
  "Industry",
  IndustrySchema
);

export default Industry;
