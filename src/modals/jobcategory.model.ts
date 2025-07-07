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

// To support filtering by category type (e.g., all 'Technical' jobs)
JobCategorySchema.index({ type: 1 });

// To filter only active categories
JobCategorySchema.index({ isActive: 1 });

// For nested category filtering (sub-category/parent relationship)
JobCategorySchema.index({ parentCategory: 1 });

const JobCategory: Model<IJobCategory> = mongoose.model<IJobCategory>(
  "JobCategory",
  JobCategorySchema
);

export default JobCategory;
