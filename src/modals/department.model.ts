import mongoose, { Document, Schema, Model } from "mongoose";

export enum DepartmentStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface IDepartment extends Document {
  name: string;
  order: number;
  description?: string;
  status: DepartmentStatus;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema: Schema<IDepartment> = new Schema(
  {
    description: { type: String, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    order: { type: Number, default: 0, index: true },
    status: {
      type: String,
      default: DepartmentStatus.ACTIVE,
      enum: Object.values(DepartmentStatus),
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

DepartmentSchema.index({ status: 1 });
DepartmentSchema.index({ order: 1, name: 1 });

const Department: Model<IDepartment> = mongoose.model<IDepartment>(
  "Department",
  DepartmentSchema,
);

export default Department;
