import mongoose, { Schema, Document } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface ITrainedWorker extends Document {
  remarks?: string;
  verifiedAt?: Date;
  status: VerificationStatus;
  document: string;
  user: Schema.Types.ObjectId;
  courseEnrollmentId: mongoose.Types.ObjectId;
}

const TrainedWorkerSchema = new Schema<ITrainedWorker>(
  {
    courseEnrollmentId: {
      required: true,
      ref: "Enrollment",
      type: mongoose.Schema.Types.ObjectId,
    },
    verifiedAt: { type: Date },
    document: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    status: {
      type: String,
      default: VerificationStatus.PENDING,
      enum: Object.values(VerificationStatus),
    },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Automatically set verifiedAt when status changes to approved
TrainedWorkerSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === VerificationStatus.APPROVED &&
    !this.verifiedAt
  ) {
    this.verifiedAt = new Date();
  }
  next();
});

// Index for finding a user's training status
TrainedWorkerSchema.index({ user: 1 });

// Index for verifying if a specific course enrollment exists
TrainedWorkerSchema.index({ courseEnrollmentId: 1 });

// Index for status filtering (pending/approved/rejected)
TrainedWorkerSchema.index({ status: 1 });

// Indexes for date-based sorting or range queries
TrainedWorkerSchema.index({ verifiedAt: -1 });
TrainedWorkerSchema.index({ createdAt: -1 });
TrainedWorkerSchema.index({ updatedAt: -1 });

// Compound index: If often querying a user and course together
TrainedWorkerSchema.index({ user: 1, courseEnrollmentId: 1 }, { unique: true });

export const TrainedWorker = mongoose.model<ITrainedWorker>(
  "TrainedWorker",
  TrainedWorkerSchema
);
