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

const WorkerCategory: Model<IWorkerCategory> = mongoose.model<IWorkerCategory>(
  "WorkerCategory",
  WorkerCategorySchema
);

export default WorkerCategory;
