import mongoose, { Schema, Document, Types } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IBestPracticesFacility extends Document {
  verifiedAt: Date;
  user: Types.ObjectId; // employer or contractor
  status: VerificationStatus;
  safetyPPEs: boolean;
  salaryOnTime: boolean;
  foodFacility: boolean;
  supportSystem: boolean;
  payslipIssued: boolean;
  attendanceBonus: boolean;
  performanceBonus: boolean;
  fairWorkingHours: boolean;
  medicalInsurance: boolean;
  salaryMinimumWage: boolean;
  statutoryBenefits: boolean;
  transportFacility: boolean;
  overtimeAsPerNorms: boolean;
  accommodationSupport: boolean;
  trainingOpportunities: boolean;
  motivationalActivities: boolean;
}

const BestPracticesFacilitySchema = new Schema<IBestPracticesFacility>(
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
    safetyPPEs: { type: Boolean, required: true },
    salaryOnTime: { type: Boolean, required: true },
    foodFacility: { type: Boolean, required: true },
    payslipIssued: { type: Boolean, required: true },
    supportSystem: { type: Boolean, required: true },
    attendanceBonus: { type: Boolean, required: true },
    medicalInsurance: { type: Boolean, required: true },
    performanceBonus: { type: Boolean, required: true },
    fairWorkingHours: { type: Boolean, required: true },
    salaryMinimumWage: { type: Boolean, required: true },
    statutoryBenefits: { type: Boolean, required: true },
    transportFacility: { type: Boolean, required: true },
    overtimeAsPerNorms: { type: Boolean, required: true },
    accommodationSupport: { type: Boolean, required: true },
    trainingOpportunities: { type: Boolean, required: true },
    motivationalActivities: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export const BestPracticesFacility = mongoose.model<IBestPracticesFacility>(
  "BestPracticesFacility",
  BestPracticesFacilitySchema
);
