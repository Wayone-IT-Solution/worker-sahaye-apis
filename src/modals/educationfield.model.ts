import mongoose, { Document, Schema, Model } from "mongoose";

export enum EducationFieldStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface IEducationField extends Document {
  name: string;
  order: number;
  description?: string;
  educationId: mongoose.Types.ObjectId;
  status: EducationFieldStatus;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EducationFieldSchema: Schema<IEducationField> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Education Field name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    educationId: {
      type: Schema.Types.ObjectId,
      ref: "Education",
      required: [true, "Education ID is required"],
      index: true,
    },
    status: {
      type: String,
      default: EducationFieldStatus.ACTIVE,
      enum: Object.values(EducationFieldStatus),
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
EducationFieldSchema.index({ educationId: 1, status: 1 });
EducationFieldSchema.index({ educationId: 1, order: 1, name: 1 });

// Unique constraint on name per education
EducationFieldSchema.index({ educationId: 1, name: 1 }, { unique: true });

const EducationField: Model<IEducationField> = mongoose.model<IEducationField>(
  "EducationField",
  EducationFieldSchema
);

export default EducationField;
