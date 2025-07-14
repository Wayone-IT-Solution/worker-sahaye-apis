import mongoose, { Schema, Document, Types } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IReliablePayer extends Document {
  verifiedAt: Date;
  user: Types.ObjectId; // employer or contractor
  noPaymentDefaults: boolean;
  status: VerificationStatus;
  salariesPaidBefore7th: boolean;
  contractorPaymentsOnTime: boolean;
}

const ReliablePayerSchema = new Schema<IReliablePayer>(
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
    noPaymentDefaults: { type: Boolean, required: true },
    salariesPaidBefore7th: { type: Boolean, required: true },
    contractorPaymentsOnTime: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export const ReliablePayer = mongoose.model<IReliablePayer>(
  "ReliablePayer",
  ReliablePayerSchema
);
