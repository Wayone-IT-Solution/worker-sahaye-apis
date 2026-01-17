import mongoose, { Schema, Document, Types } from "mongoose";

export enum VirtualHRRequestStatus {
  PENDING = "Pending",
  ASSIGNED = "Assigned",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
  IN_PROGRESS = "In Progress",
}

export interface IVirtualHRRequest extends Document {
  email: string;
  createdAt: Date;
  updatedAt: Date;
  minWage: number;
  location: string;
  assignedAt?: Date;
  isActive: boolean;
  completedAt?: Date;
  companyName: string;
  mobileNumber: string;
  contactPerson: string;

  userId: Types.ObjectId;
  expectedStartDate: Date;
  serviceType: "Virtual HR";
  jobDescriptionUrl?: string;
  assignedBy?: Types.ObjectId;
  cancellationReason?: string;
  assignedTo?: Types.ObjectId;
  status: VirtualHRRequestStatus;
  duration: { from: Date; to: Date };
  workingHours: { from: string; to: string };
  preferredContactHours: { from: string; to: string };
  designation: "Executive" | "Manager" | "Lead" | string;
  role: "Onboarding" | "Payroll" | "Recruitment" | string;
  communicationMode: "Google Meet" | "Phone Call" | "WhatsApp" | "Zoom" | string;
}

const VirtualHRRequestSchema = new Schema<IVirtualHRRequest>(
  {
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    mobileNumber: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/,
    },
    userId: {
      ref: "User",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    email: {
      type: String,
      required: true,
      match: /^\S+@\S+\.\S+$/,
    },
    serviceType: {
      type: String,
      enum: ["Virtual HR"],
      default: "Virtual HR",
    },
    designation: {
      type: String,
      enum: ["Executive", "Manager", "Lead"],
      required: true,
    },
    role: {
      type: String,
      enum: ["Onboarding", "Payroll", "Recruitment"],
      required: true,
    },
    location: { type: String, required: true },
    expectedStartDate: { type: Date, required: true },
    duration: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    workingHours: {
      from: { type: String, required: true },
      to: { type: String, required: true },
    },
    preferredContactHours: {
      from: { type: String, required: true },
      to: { type: String, required: true },
    },
    minWage: {
      type: Number,
      required: true,
      min: 0,
    },
    communicationMode: {
      type: String,
      enum: ["Google Meet", "Phone Call", "WhatsApp", "Zoom"],
      required: true,
    },
    jobDescriptionUrl: { type: String },
    status: {
      type: String,
      enum: Object.values(VirtualHRRequestStatus),
      default: VirtualHRRequestStatus.PENDING,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    assignedAt: { type: Date },
    completedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    cancellationReason: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

export const VirtualHRRequest = mongoose.model<IVirtualHRRequest>(
  "VirtualHRRequest",
  VirtualHRRequestSchema
);
