import mongoose, { Schema, Document, Types } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IPoliceVerification extends Document {
  name: string;
  document: string;
  remarks?: string;
  verifiedAt?: Date;
  user: Types.ObjectId;
  status: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PoliceVerificationSchema = new Schema<IPoliceVerification>(
  {
    user: {
      ref: "User",
      unique: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    name: { type: String, required: true },
    document: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
    },
    remarks: { type: String },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

// Automatically set verifiedAt when status changes to approved
PoliceVerificationSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === VerificationStatus.APPROVED &&
    !this.verifiedAt
  ) {
    this.verifiedAt = new Date();
  }
  next();
});

export const PoliceVerification = mongoose.model<IPoliceVerification>(
  "PoliceVerification",
  PoliceVerificationSchema
);
