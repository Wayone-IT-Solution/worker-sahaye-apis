import mongoose, { Schema, Document, Types } from "mongoose";

export enum InterviewStatus {
  PENDING = "pending",
  ON_HOLD = "on-hold",
  REJECTED = "rejected",
  SHORTLISTED = "shortlisted",
}

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IPreInterviewed extends Document {
  createdAt: Date;
  updatedAt: Date;
  document?: string;
  feedback?: string;
  verifiedAt?: Date;
  interviewedAt?: Date;
  user: Types.ObjectId;
  status: VerificationStatus;
  interviewer?: Types.ObjectId;
  interviewStatus: InterviewStatus;
}

const PreInterviewedSchema = new Schema<IPreInterviewed>(
  {
    user: {
      ref: "User",
      unique: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    document: { type: String },
    feedback: { type: String },
    status: {
      type: String,
      default: VerificationStatus.PENDING,
      enum: Object.values(VerificationStatus),
    },
    interviewStatus: {
      type: String,
      enum: Object.values(InterviewStatus),
      default: InterviewStatus.PENDING,
    },
    verifiedAt: { type: Date },
    interviewedAt: { type: Date },
  },
  { timestamps: true }
);

PreInterviewedSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.interviewStatus !== InterviewStatus.PENDING &&
    !this.interviewedAt
  ) {
    this.interviewedAt = new Date();
  }
  next();
});

export const PreInterviewed = mongoose.model<IPreInterviewed>(
  "PreInterviewed",
  PreInterviewedSchema
);
