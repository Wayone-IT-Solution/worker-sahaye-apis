import mongoose, { Document, Schema, Types } from "mongoose";

export enum LoanStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum LoanPurpose {
  PERSONAL = "personal",
  BUSINESS = "business",
  HOME = "home",
  VEHICLE = "vehicle",
  EDUCATION = "education",
  MEDICAL = "medical",
  OTHER = "other",
}

export interface ILoanSupport extends Document {
  userId: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  loanAmount: number;
  currentSalary: number;
  loanNeededDate: Date;
  employerName: string;
  jobTitle: string;
  loanPurpose: LoanPurpose;
  loanCategory: string;
  reasonForLoan: string;
  status: LoanStatus;
  approvalNotes?: string;
  approvedAmount?: number;
  approvedDate?: Date;
  rejectionReason?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LoanSupportSchema = new Schema<ILoanSupport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    loanAmount: {
      type: Number,
      required: true,
      min: 1000,
      max: 5000000,
    },
    currentSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    loanNeededDate: {
      type: Date,
      required: true,
    },
    employerName: {
      type: String,
      // required: true,
      trim: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    loanPurpose: {
      type: String,
      enum: Object.values(LoanPurpose),
      // required: true,
    },
    loanCategory: {
      type: String,
      required: true,
      trim: true,
    },
    reasonForLoan: {
      type: String,
      // required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(LoanStatus),
      default: LoanStatus.PENDING,
      index: true,
    },
    approvalNotes: String,
    rejectionReason: String,
    approvedAmount: Number,
    approvedDate: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
LoanSupportSchema.index({ userId: 1, createdAt: -1 });
LoanSupportSchema.index({ email: 1 });
LoanSupportSchema.index({ phone: 1 });
LoanSupportSchema.index({ status: 1, createdAt: -1 });
LoanSupportSchema.index({ loanPurpose: 1 });

export default mongoose.model<ILoanSupport>("LoanSupport", LoanSupportSchema);
