import mongoose, { Schema, Document, Types } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface ITrustedPartner extends Document {
  verifiedAt: Date;
  user: Types.ObjectId; // employer or contractor
  validLicenses: boolean;
  positiveFeedback: boolean;
  status: VerificationStatus;
  noContractDisputes: boolean;
  insuranceOrBonding: boolean;
  statutoryCompliance: boolean;
  completedProjectsOnTime: boolean;
}

const TrustedPartnerSchema = new Schema<ITrustedPartner>(
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
    validLicenses: { type: Boolean, required: true },
    positiveFeedback: { type: Boolean, required: true },
    insuranceOrBonding: { type: Boolean, required: true },
    noContractDisputes: { type: Boolean, required: true },
    statutoryCompliance: { type: Boolean, required: true },
    completedProjectsOnTime: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export const TrustedPartner = mongoose.model<ITrustedPartner>(
  "TrustedPartner",
  TrustedPartnerSchema
);
