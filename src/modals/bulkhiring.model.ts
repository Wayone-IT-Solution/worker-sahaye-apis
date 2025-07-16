import mongoose, { Schema, Document, Types } from "mongoose";

export enum JobOpeningTime {
  WEEKLY = "Weekly",
  MONTHLY = "Monthly",
  QUARTERLY = "Quarterly",
  YEARLY = "Yearly",
  URGENT = "Urgent",
}

export enum BulkHiringStatus {
  PENDING = "Pending",
  ASSIGNED = "Assigned",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
  IN_PROGRESS = "In Progress",
}

export interface IBulkHiringRequest extends Document {
  city: string;
  state: string;
  location: string;
  isActive: boolean;
  hiringIntent: string;
  userId: Types.ObjectId;
  numberOfWorkers: number;
  additionalNotes?: string;
  status: BulkHiringStatus;
  totalHiringAmount: number;
  preferredContactDate: Date;
  preferredContactTime: string;
  jobOpeningTime: JobOpeningTime;
  budget: { from: number; to: number };

  // Assignment workflow
  assignedAt?: Date;
  assignedTo?: Types.ObjectId;
  assignedBy?: Types.ObjectId;

  // Optional end/cancel metadata
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const BulkHiringRequestSchema = new Schema<IBulkHiringRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hiringIntent: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    numberOfWorkers: {
      type: Number,
      required: true,
      min: 1,
    },
    location: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    totalHiringAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    jobOpeningTime: {
      type: String,
      enum: Object.values(JobOpeningTime),
      required: true,
    },
    budget: {
      from: { type: Number, required: true },
      to: { type: Number, required: true },
    },
    preferredContactDate: {
      type: Date,
      required: true,
    },
    preferredContactTime: {
      type: String,
      required: true,
    },
    additionalNotes: {
      type: String,
      maxlength: 1000,
    },

    // Status tracking
    status: {
      type: String,
      enum: Object.values(BulkHiringStatus),
      default: BulkHiringStatus.PENDING,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Assignment workflow
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "VirtualHR",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    assignedAt: {
      type: Date,
    },

    // Completion / Cancellation metadata
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

export const BulkHiringRequest = mongoose.model<IBulkHiringRequest>(
  "BulkHiringRequest",
  BulkHiringRequestSchema
);
