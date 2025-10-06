import mongoose, { Document, Schema, Model } from "mongoose";

export enum WorkNatureStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export enum WorkNatureType {
  REMOTE = "Remote",
  HYBRID = "Hybrid",
  CONTRACT = "Contract",
  FULL_TIME = "Full-time",
  PART_TIME = "Part-time",
  FREELANCE = "Freelance",
  TEMPORARY = "Temporary",
  VOLUNTEER = "Volunteer",
  INTERNSHIP = "Internship",
}

export interface INatureOfWork extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
  type: WorkNatureType;
  description?: string;
  status: WorkNatureStatus;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const NatureOfWorkSchema: Schema<INatureOfWork> = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: Object.values(WorkNatureType), required: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      default: WorkNatureStatus.ACTIVE,
      enum: Object.values(WorkNatureStatus),
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Indexes
NatureOfWorkSchema.index({ status: 1 });
NatureOfWorkSchema.index({ type: 1 });

const NatureOfWork: Model<INatureOfWork> = mongoose.model<INatureOfWork>(
  "NatureOfWork",
  NatureOfWorkSchema
);

export default NatureOfWork;
