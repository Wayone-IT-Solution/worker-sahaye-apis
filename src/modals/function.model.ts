import mongoose, { Document, Schema, Model } from "mongoose";

export enum FunctionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface IFunction extends Document {
  name: string;
  order: number;
  icon?: string;
  description?: string;
  departmentId: mongoose.Types.ObjectId;
  status: FunctionStatus;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FunctionSchema: Schema<IFunction> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Function name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    order: {
      type: Number,
      default: 0,
      index: true,
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
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department ID is required"],
      index: true,
    },
    status: {
      type: String,
      default: FunctionStatus.ACTIVE,
      enum: Object.values(FunctionStatus),
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
  { timestamps: true },
);

// Compound index for efficient querying
FunctionSchema.index({ departmentId: 1, status: 1 });
FunctionSchema.index({ departmentId: 1, order: 1, name: 1 });

// Unique constraint on name per department
FunctionSchema.index({ departmentId: 1, name: 1 }, { unique: true });

const Function: Model<IFunction> = mongoose.model<IFunction>(
  "Function",
  FunctionSchema,
);

export default Function;
