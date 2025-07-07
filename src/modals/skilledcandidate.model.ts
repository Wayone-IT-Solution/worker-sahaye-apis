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

// Index to quickly find by user
SkilledCandidateSchema.index({ user: 1 });

// Index to filter or query by verification status (e.g., pending, approved)
SkilledCandidateSchema.index({ status: 1 });

// Index to quickly retrieve recently verified candidates
SkilledCandidateSchema.index({ verifiedAt: -1 });

// Compound index: common query (e.g., get all approved users with document)
SkilledCandidateSchema.index({ status: 1, user: 1 });

// For sorting by creation time (recent submissions)
SkilledCandidateSchema.index({ createdAt: -1 });

export const SkilledCandidate = mongoose.model<ISkilledCandidate>(
  "SkilledCandidate",
  SkilledCandidateSchema
);
