import mongoose, { Document, Schema, Model } from "mongoose";

export interface IDesignation extends Document {
  name: string;
  slug?: string;
  order: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DesignationSchema: Schema<IDesignation> = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, trim: true, lowercase: true, index: true },
    order: { type: Number, default: 0, index: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

DesignationSchema.index({ order: 1 });
DesignationSchema.index({ isActive: 1 });

const Designation: Model<IDesignation> = mongoose.model<IDesignation>(
  "Designation",
  DesignationSchema,
);

export default Designation;
