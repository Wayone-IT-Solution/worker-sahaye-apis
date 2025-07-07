import mongoose, { Document, Schema, Model } from "mongoose";

export enum WorkerCategoryType {
  SKILLED = "Skilled",
  EXECUTIVE = "Executive",
  UNSKILLED = "Unskilled",
  SEMISKILLED = "Semiskilled",
  SUPERVISORY = "Supervisory",
  MANAGERIAL = "Managerial and above",
}

export interface IWorkerCategory extends Document {
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  description?: string;
  type: WorkerCategoryType;
}

const WorkerCategorySchema: Schema<IWorkerCategory> = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(WorkerCategoryType),
      required: true,
      unique: true,
    },
    description: {
      trim: true,
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index on type for quick lookup (already unique)
WorkerCategorySchema.index({ type: 1 }, { unique: true });

// Index on isActive for filtering active/inactive categories
WorkerCategorySchema.index({ isActive: 1 });

// Index on timestamps for sorting/filtering
WorkerCategorySchema.index({ createdAt: -1 });
WorkerCategorySchema.index({ updatedAt: -1 });

const WorkerCategory: Model<IWorkerCategory> = mongoose.model<IWorkerCategory>(
  "WorkerCategory",
  WorkerCategorySchema
);

export default WorkerCategory;
