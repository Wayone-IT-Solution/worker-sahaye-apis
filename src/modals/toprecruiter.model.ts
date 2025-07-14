import mongoose, { Schema, Document, Types } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface ITopRecruiter extends Document {
  score: number;                            // e.g. 89%
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
  behaviors: string[];                      // e.g. ["Responding Calls", "Meeting Employers"]
  user: Types.ObjectId;                     // Candidate
  status: VerificationStatus;
}

const TopRecruiterSchema = new Schema<ITopRecruiter>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One record per user
    },
    score: {
      min: 0,
      max: 100,
      type: Number,
    },
    behaviors: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      default: VerificationStatus.PENDING,
      enum: Object.values(VerificationStatus),
    },
    verifiedAt: Date,
  },
  { timestamps: true }
);

export const TopRecruiter = mongoose.model<ITopRecruiter>("TopRecruiter", TopRecruiterSchema);
