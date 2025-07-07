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

export const TrainedWorker = mongoose.model<ITrainedWorker>(
  "TrainedWorker",
  TrainedWorkerSchema
);
