import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILoanRequest extends Document {
  loanCategory:
    | "housing"
    | "education"
    | "medical"
    | "personal"
    | "car_loan"
    | "bike_loan"
    | "marriage";

  createdAt: Date;
  updatedAt: Date;

  assignedAt?: Date;
  completedAt?: Date;
  status: LoanRequestStatus;
  assignedTo?: Types.ObjectId;
  assignedBy?: Types.ObjectId;
  actions?: Array<{
    action: string;
    status?: LoanRequestStatus;
    message?: string;
    timestamp: Date;
    performedBy?: Types.ObjectId;
    performedByRole?: string;
  }>;

  history?: any;
  emailId?: string;
  loanNeedDate: Date;
  isHighRisk: boolean;
  companyName: string;
  mobileNumber: string;
  currentSalary: string;
  userId: Types.ObjectId;
  cancellationReason?: string;
  estimatedLoanEligibility: number;
}

export enum LoanRequestStatus {
  PENDING = "Pending",
  ASSIGNED = "Assigned",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
  IN_PROGRESS = "In Progress",
}

const LoanRequestSchema: Schema<ILoanRequest> = new Schema(
  {
    loanCategory: {
      type: String,
      enum: [
        "housing",
        "education",
        "medical",
        "personal",
        "car_loan",
        "bike_loan",
        "marriage",
      ],
      required: true,
    },

    companyName: {
      trim: true,
      type: String,
      required: true,
    },

    userId: {
      ref: "User",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },

    currentSalary: {
      type: String,
      required: true,
    },

    history: [
      {
        comment: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        commentedBy: { type: Types.ObjectId, ref: "Admin", required: true },
      },
    ],

    assignedAt: { type: Date },
    completedAt: { type: Date },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    status: {
      type: String,
      enum: Object.values(LoanRequestStatus),
      default: LoanRequestStatus.PENDING,
      index: true,
    },
    actions: [
      {
        action: { type: String, required: true, trim: true },
        status: {
          type: String,
          enum: Object.values(LoanRequestStatus),
        },
        message: { type: String, trim: true, maxlength: 1000 },
        timestamp: { type: Date, default: Date.now },
        performedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
        performedByRole: { type: String, trim: true, lowercase: true },
      },
    ],
    cancellationReason: { type: String, maxlength: 1000 },

    loanNeedDate: {
      type: Date,
    },

    mobileNumber: {
      type: String,
      required: true,
      match: [
        /^(\+91)?[6-9]\d{9}$/,
        "Please enter a valid Indian mobile number",
      ],
    },

    emailId: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Invalid email format"],
    },

    estimatedLoanEligibility: {
      type: Number,
      default: 0,
    },

    isHighRisk: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// 📅 Index for loan need date (useful for filtering upcoming loans)
LoanRequestSchema.index({ loanNeedDate: 1 });

// 💰 Index for salary slab filtering
LoanRequestSchema.index({ salarySlab: 1 });

// 🚨 Index for high-risk flag (often used in risk analysis dashboards)
LoanRequestSchema.index({ isHighRisk: 1 });

// 📊 Index for salary range queries (e.g., for analytics)
LoanRequestSchema.index({ currentSalary: 1 });

// 📦 Compound index if you often filter by userId + loan type
LoanRequestSchema.index({ userId: 1, loanCategory: 1 });

// 📆 Sorting by creation date
LoanRequestSchema.index({ createdAt: -1 });

export const LoanRequestModel = mongoose.model<ILoanRequest>(
  "LoanRequest",
  LoanRequestSchema,
);
