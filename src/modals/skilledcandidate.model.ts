import mongoose, { Schema, Document } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface ISkilledCandidate extends Document {
  remarks?: string;
  document: string;
  verifiedAt?: Date;
  status: VerificationStatus;
  user: Schema.Types.ObjectId;
}

const SkilledCandidateSchema = new Schema<ISkilledCandidate>(
  {
    document: { type: String, required: true },
    status: {
      type: String,
      default: VerificationStatus.PENDING,
      enum: Object.values(VerificationStatus),
    },
    remarks: { type: String },
    verifiedAt: { type: Date },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true }
);

// Automatically set verifiedAt when status changes to approved
SkilledCandidateSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === VerificationStatus.APPROVED &&
    !this.verifiedAt
  ) {
    this.verifiedAt = new Date();
  }
  next();
});

export const SkilledCandidate = mongoose.model<ISkilledCandidate>(
  "SkilledCandidate",
  SkilledCandidateSchema
);
