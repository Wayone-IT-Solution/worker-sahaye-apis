import mongoose, { Schema, Document, Types } from "mongoose";

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IPreInterviewedContractor extends Document {
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
  user: Types.ObjectId;
  numberOfClients: number;
  numberOfEmployees: number;
  completedProjects: number;
  financialTurnover: number;
  status: VerificationStatus;
  workplaceAccidents: number;
  noPaymentComplaints: boolean;
  canMobilizeManpower: boolean;
}

const PreInterviewedContractorSchema = new Schema<IPreInterviewedContractor>(
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
    numberOfClients: { type: Number, required: true },
    numberOfEmployees: { type: Number, required: true },
    completedProjects: { type: Number, required: true },
    financialTurnover: { type: Number, required: true },
    workplaceAccidents: { type: Number, required: true },
    noPaymentComplaints: { type: Boolean, required: true },
    canMobilizeManpower: { type: Boolean, required: true },
  },
  { timestamps: true }
);

// Auto-fill verifiedAt when status becomes approved
PreInterviewedContractorSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === VerificationStatus.APPROVED &&
    !this.verifiedAt
  ) {
    this.verifiedAt = new Date();
  }
  next();
});

// Indexes for search and filtering
PreInterviewedContractorSchema.index({ status: 1 });
PreInterviewedContractorSchema.index({ verifiedAt: -1 });
PreInterviewedContractorSchema.index({ interviewedAt: -1 });
PreInterviewedContractorSchema.index({ status: 1, interviewedAt: -1 });

export const PreInterviewedContractor = mongoose.model<IPreInterviewedContractor>(
  "PreInterviewedContractor",
  PreInterviewedContractorSchema
);
