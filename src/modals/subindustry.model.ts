import mongoose, { Document, Schema, Model } from "mongoose";

export enum SubIndustryStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface ISubIndustry extends Document {
  name: string;
  icon?: string;
  description?: string;
  industryId: mongoose.Types.ObjectId;
  status: SubIndustryStatus;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubIndustrySchema: Schema<ISubIndustry> = new Schema(
  {
    name: {
      type: String,
      required: [true, "SubIndustry name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    icon: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    industryId: {
      type: Schema.Types.ObjectId,
      ref: "Industry",
      required: [true, "Industry ID is required"],
      index: true,
    },
    status: {
      type: String,
      default: SubIndustryStatus.ACTIVE,
      enum: Object.values(SubIndustryStatus),
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Compound index for efficient querying
SubIndustrySchema.index({ industryId: 1, status: 1 });

// Unique constraint on name per industry
SubIndustrySchema.index({ industryId: 1, name: 1 }, { unique: true });

const SubIndustry: Model<ISubIndustry> = mongoose.model<ISubIndustry>(
  "SubIndustry",
  SubIndustrySchema
);

export default SubIndustry;
