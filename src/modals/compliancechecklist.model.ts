import mongoose, { Schema, Document, Types } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IComplianceChecklist extends Document {
  pf: boolean;
  pt: boolean;
  esic: boolean;
  bonus: boolean;
  verifiedAt: Date;
  gratuity: boolean;
  user: Types.ObjectId; // employer or contractor
  timelySalary: boolean;
  minimumWages: boolean;
  workplaceSafety: boolean;
  laborWelfareFund: boolean;
  status: VerificationStatus;
  employmentContract: boolean;
}

const ComplianceChecklistSchema = new Schema<IComplianceChecklist>(
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
    verifiedAt: { type: Date },
    pt: { type: Boolean, default: true },
    pf: { type: Boolean, default: true },
    esic: { type: Boolean, default: true },
    bonus: { type: Boolean, default: true },
    gratuity: { type: Boolean, default: true },
    minimumWages: { type: Boolean, default: true },
    timelySalary: { type: Boolean, default: true },
    workplaceSafety: { type: Boolean, default: true },
    laborWelfareFund: { type: Boolean, default: true },
    employmentContract: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ComplianceChecklist = mongoose.model<IComplianceChecklist>(
  "ComplianceChecklist",
  ComplianceChecklistSchema
);
