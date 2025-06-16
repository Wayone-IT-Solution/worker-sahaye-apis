import mongoose, { Document, Schema, Model } from "mongoose";

export enum JobCategoryType {
  OTHERS = "Others",
  SERVICE = "Service",
  CREATIVE = "Creative",
  EDUCATION = "Education",
  TECHNICAL = "Technical",
  MANAGEMENT = "Management",
  HEALTHCARE = "Healthcare",
  CONSTRUCTION = "Construction",
  NON_TECHNICAL = "Non-Technical",
}

export interface IJobCategory extends Document {
  name: string;
  type: JobCategoryType;
  description?: string;
  icon?: string; // optional icon for UI display
  parentCategory?: mongoose.Types.ObjectId; // optional for sub-categories
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JobCategorySchema: Schema<IJobCategory> = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: Object.values(JobCategoryType),
      required: true,
    },
    description: { type: String, trim: true },
    icon: { type: String },
    parentCategory: { type: Schema.Types.ObjectId, ref: "JobCategory" },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const JobCategory: Model<IJobCategory> = mongoose.model<IJobCategory>(
  "JobCategory",
  JobCategorySchema
);

export default JobCategory;
