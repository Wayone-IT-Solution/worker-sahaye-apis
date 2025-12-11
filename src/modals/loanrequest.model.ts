import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILoanRequest extends Document {
  loanCategory:
  | "Car Loan"
  | "Housing Loan"
  | "Personal Loan"
  | "Education Loan";
  createdAt: Date;
  updatedAt: Date;

  assignedAt?: Date;
  completedAt?: Date;
  status: LoanRequestStatus;
  assignedTo?: Types.ObjectId;
  assignedBy?: Types.ObjectId;

  history?: any;
  emailId?: string;
  loanNeedDate: Date;
  isHighRisk: boolean;
  companyName: string;
  mobileNumber: string;
  currentSalary: number;
  userId: Types.ObjectId;
  cancellationReason?: string;
  estimatedLoanEligibility: number;
  salarySlab: "below_3_lakh" | "3_to_5_lakh" | "5_to_10_lakh" | "10_lakh_plus";
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
      enum: ["Housing Loan", "Personal Loan", "Car Loan", "Education Loan"],
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
      type: Number,
      required: true,
      min: [100000, "Salary must be at least ₹1,00,000 annually"],
    },

    history: [
      {
        comment: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        commentedBy: { type: Types.ObjectId, ref: "Admin", required: true },
      },
    ],

    salarySlab: {
      type: String,
      enum: ["below_3_lakh", "3_to_5_lakh", "5_to_10_lakh", "10_lakh_plus"],
      required: true,
    },

    assignedAt: { type: Date },
    completedAt: { type: Date },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "VirtualHR",
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
    cancellationReason: { type: String, maxlength: 1000 },

    loanNeedDate: {
      type: Date,
    },

    mobileNumber: {
      type: String,
      required: true,
      match: [/^\+91[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
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
  { timestamps: true }
);

// 📌 Pre-save middleware to compute eligibility & risk
LoanRequestSchema.pre<ILoanRequest>("save", function (next) {
  const salary = this.currentSalary;

  // Calculate estimated eligibility (basic logic)
  // Formula: Eligible Loan = Salary * Multiplier (varies per slab)
  let multiplier = 0;
  if (salary < 300000) {
    this.salarySlab = "below_3_lakh";
    multiplier = 3.5;
  } else if (salary < 500000) {
    this.salarySlab = "3_to_5_lakh";
    multiplier = 5;
  } else if (salary < 1000000) {
    this.salarySlab = "5_to_10_lakh";
    multiplier = 7;
  } else {
    this.salarySlab = "10_lakh_plus";
    multiplier = 8.5;
  }

  this.estimatedLoanEligibility = Math.round(salary * multiplier);

  // Mark high risk if date is too soon or salary too low
  const daysUntilLoan =
    (this.loanNeedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  this.isHighRisk = salary < 300000 || daysUntilLoan < 7;

  next();
});

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
  LoanRequestSchema
);
