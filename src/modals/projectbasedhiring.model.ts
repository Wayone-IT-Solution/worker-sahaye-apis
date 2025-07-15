import mongoose, { Schema, Document, Types } from "mongoose";

export enum ProjectHiringStatus {
  PENDING = "Pending",
  ASSIGNED = "Assigned",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
  IN_PROGRESS = "In Progress",
}

export interface IProjectBasedHiring extends Document {
  createdAt: Date;
  updatedAt: Date;
  location: string;
  isActive: boolean;
  assignedAt?: Date;
  completedAt?: Date;
  description: string;
  projectTitle: string;
  userId: Types.ObjectId;
  numberOfWorkers: number;
  preferredSkills: string[];
  optionalQuestion?: string;
  assignedBy?: Types.ObjectId;
  status: ProjectHiringStatus;
  cancellationReason?: string;
  assignedTo?: Types.ObjectId;
  duration: { from: Date; to: Date };
  budget: { from: number; to: number };
  employmentType: "Contract" | "Freelance" | "Temporary" | string;
}

const ProjectBasedHiringSchema = new Schema<IProjectBasedHiring>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    projectTitle: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    budget: {
      from: { type: Number, required: true },
      to: { type: Number, required: true },
    },
    optionalQuestion: {
      type: String,
      maxlength: 500,
    },
    numberOfWorkers: {
      type: Number,
      required: true,
      min: 1,
    },
    preferredSkills: {
      type: [String],
      default: [],
    },
    employmentType: {
      type: String,
      enum: ["Contract", "Freelance", "Temporary"],
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "VirtualHR",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    assignedAt: { type: Date },
    completedAt: { type: Date },
    cancellationReason: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: Object.values(ProjectHiringStatus),
      default: ProjectHiringStatus.PENDING,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const ProjectBasedHiring = mongoose.model<IProjectBasedHiring>(
  "ProjectBasedHiring",
  ProjectBasedHiringSchema
);
