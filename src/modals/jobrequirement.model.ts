import mongoose, { Schema, Document, Types } from "mongoose";

export enum JobRequirementStatus {
  PENDING = "Pending",
  ASSIGNED = "Assigned",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
  IN_PROGRESS = "In Progress",
}

export interface IJobRequirement extends Document {
  email: string;
  updatedAt: Date;
  minWage: string;
  createdAt: Date;
  assignedAt?: Date;
  isActive: boolean;
  completedAt?: Date;
  designation: string;
  mobileNumber: string;
  contactPerson: string;
  userId: Types.ObjectId;
  expectedStartDate: Date;
  numberOfPositions: number;
  perksAndBenefits?: string;
  preferredLocation: string;
  jobDescriptionUrl?: string;
  requiredSkillset: string[];
  jobCategory: Types.ObjectId;
  assignedBy?: Types.ObjectId;
  cancellationReason?: string;
  specialInstructions?: string;
  status: JobRequirementStatus;
  assignedRecruiterId?: Types.ObjectId;
  workingHours: { from: string; to: string };
  employmentType: "Full-Time" | "Part-Time" | "Contractual" | "Freelance" | string;
}

const JobRequirementSchema = new Schema<IJobRequirement>(
  {
    contactPerson: { type: String, required: true, trim: true },
    mobileNumber: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/,
    },
    email: {
      type: String,
      required: true,
      match: /^\S+@\S+\.\S+$/,
    },
    designation: { type: String, required: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    jobCategory: {
      type: Schema.Types.ObjectId,
      ref: "JobCategory",
      required: true,
    },
    numberOfPositions: {
      type: Number,
      min: 1,
      required: true,
    },
    requiredSkillset: {
      type: [String],
      default: [],
    },
    employmentType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contractual", "Freelance"],
      required: true,
    },
    preferredLocation: {
      type: String,
      required: true,
    },
    expectedStartDate: {
      type: Date,
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    cancellationReason: { type: String, maxlength: 1000 },
    minWage: {
      type: String,
      required: true,
    },
    workingHours: {
      from: { type: String, required: true },
      to: { type: String, required: true },
    },
    perksAndBenefits: { type: String, trim: true },
    specialInstructions: { type: String, trim: true },
    jobDescriptionUrl: { type: String },

    // New fields
    status: {
      type: String,
      enum: Object.values(JobRequirementStatus),
      default: JobRequirementStatus.PENDING,
    },
    assignedRecruiterId: {
      type: Schema.Types.ObjectId,
      ref: "VirtualHR",
    },
    assignedAt: { type: Date },
    completedAt: { type: Date },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const JobRequirement = mongoose.model<IJobRequirement>(
  "JobRequirement",
  JobRequirementSchema
);
