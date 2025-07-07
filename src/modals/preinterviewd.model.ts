import mongoose, { Schema, Document, Types } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IPreInterviewed extends Document {
  createdAt: Date;
  updatedAt: Date;
  document?: string;
  remarks?: string;
  verifiedAt?: Date;
  interviewedAt?: Date;
  user: Types.ObjectId;
  status: VerificationStatus;
}

const PreInterviewedSchema = new Schema<IPreInterviewed>(
  {
    user: {
      ref: "User",
      unique: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    status: {
      type: String,
      default: VerificationStatus.PENDING,
      enum: Object.values(VerificationStatus),
    },
    document: { type: String },
    verifiedAt: { type: Date },
    remarks: { type: String, required: true },
    interviewedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Automatically set verifiedAt when status changes to approved
PreInterviewedSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === VerificationStatus.APPROVED &&
    !this.verifiedAt
  ) {
    this.verifiedAt = new Date();
  }
  next();
});

export const PreInterviewed = mongoose.model<IPreInterviewed>(
  "PreInterviewed",
  PreInterviewedSchema
);
