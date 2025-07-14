import mongoose, { Schema, Document, Types } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface ISafeWorkplace extends Document {
  verifiedAt: Date;
  user: Types.ObjectId; // employer or contractor
  status: VerificationStatus;
  noAccidentRecords: boolean;
  hasEmergencyResponse: boolean;
  conductsSafetyTraining: boolean;
  followsStatutoryCompliance: boolean;
  compliesWithHealthRegulations: boolean;
}

const SafeWorkplaceSchema = new Schema<ISafeWorkplace>(
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
    noAccidentRecords: { type: Boolean, required: true },
    hasEmergencyResponse: { type: Boolean, required: true },
    conductsSafetyTraining: { type: Boolean, required: true },
    followsStatutoryCompliance: { type: Boolean, required: true },
    compliesWithHealthRegulations: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export const SafeWorkplace = mongoose.model<ISafeWorkplace>(
  "SafeWorkplace",
  SafeWorkplaceSchema
);
