import mongoose, { Document, Schema, Model } from "mongoose";

export enum EducationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface IEducation extends Document {
  name: string;
  order: number;
  description?: string;
  status: EducationStatus;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EducationSchema: Schema<IEducation> = new Schema(
  {
    description: { type: String, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    order: { type: Number, default: 0, index: true },
    status: {
      type: String,
      default: EducationStatus.ACTIVE,
      enum: Object.values(EducationStatus),
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

EducationSchema.index({ status: 1 });
EducationSchema.index({ order: 1, name: 1 });

const Education: Model<IEducation> = mongoose.model<IEducation>(
  "Education",
  EducationSchema,
);

export default Education;
