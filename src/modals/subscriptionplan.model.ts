import mongoose, { Schema, Document } from "mongoose";

export enum UserType {
  WORKER = "worker",
  EMPLOYER = "employer",
  CONTRACTOR = "contractor",
}

export enum PlanType {
  FREE = "free",
  BASIC = "basic",
  PREMIUM = "premium",
  GROWTH = "growth",
  ENTERPRISE = "enterprise",
  PROFESSIONAL = "professional",
}

export enum BillingCycle {
  MONTHLY = "monthly",
  ANNUALLY = "annually",
  LIFETIME = "lifetime",
  QUARTERLY = "quarterly",
  SEMI_ANNUALLY = "semi_annually",
  PAY_AS_YOU_GO = "pay_as_you_go",
}


export const calculateExpiryDate = (
  startDate: Date,
  cycle: BillingCycle,
): Date => {
  const date = new Date(startDate);
  switch (cycle) {
    case BillingCycle.MONTHLY:
      date.setMonth(date.getMonth() + 1);
      break;
    case BillingCycle.QUARTERLY:
      date.setMonth(date.getMonth() + 3);
      break;
    case BillingCycle.SEMI_ANNUALLY:
      date.setMonth(date.getMonth() + 6);
      break;
    case BillingCycle.ANNUALLY:
      date.setFullYear(date.getFullYear() + 1);
      break;
    case BillingCycle.LIFETIME:
      date.setFullYear(date.getFullYear() + 100);
      break;
    case BillingCycle.PAY_AS_YOU_GO:
      date.setDate(date.getDate() + 1);
      break;
    default:
      throw new Error("Invalid billing cycle");
  }
  return date;
};

export enum Currency {
  INR = "INR",
}

export enum PlanStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface ISubscriptionPlan extends Document {
  name: string;
  features: any[];
  createdAt: Date;
  updatedAt: Date;
  priority: number;
  tagline?: string;
  basePrice: number;
  currency: Currency;
  planType: PlanType;
  userType: UserType;
  status: PlanStatus;
  isPopular: boolean;
  displayName: string;
  description: string;
  isRecommended: boolean;
  billingCycle: BillingCycle;
  monthlyJobListingLimit?: number | null;
  // Job Post Limits
  agencyJobPostLimits?: {
    customer?: number | null;
    agency?: number | null;
  };
  employerJobPostLimits?: {
    agency?: number | null;
    candidate?: number | null;
  };
  // Save limits (for profile, job, draft saving)
  totalSavesLimit?: number; // Overall monthly save limit
  saveProfilesLimit?: number; // Monthly limit for saving profiles
  saveJobsLimit?: number; // Monthly limit for saving jobs
  saveDraftsLimit?: number; // Monthly limit for saving drafts
  // Engagement limits - per recipient type
  inviteSendLimit?:
  | {
    worker?: number;
    employer?: number;
    contractor?: number;
  }
  | number; // Can be single number (legacy) or per-role object
  viewProfileLimit?:
  | {
    worker?: number;
    employer?: number;
    contractor?: number;
  }
  | number;
  contactUnlockLimit?:
  | {
    worker?: number;
    employer?: number;
    contractor?: number;
  }
  | number;
  saveProfileLimit?:
  | {
    worker?: number;
    employer?: number;
    contractor?: number;
  }
  | number;

  jobViewPerMonth?: number | null;
  // number = monthly limit
  // null = unlimited
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      trim: true,
      index: true,
      unique: true,
      required: true,
      maxlength: 100,
    },
    displayName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    tagline: {
      type: String,
      maxlength: 200,
    },
    planType: {
      type: String,
      required: true,
      enum: Object.values(PlanType),
      index: true,
    },
    userType: {
      type: String,
      required: true,
      enum: Object.values(UserType),
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: Currency.INR,
      enum: Object.values(Currency),
    },
    billingCycle: {
      type: String,
      required: true,
      enum: Object.values(BillingCycle),
    },
    features: [{ type: Schema.Types.ObjectId, ref: "Feature" }],
    monthlyJobListingLimit: {
      type: Number,
      min: 0,
      // Represents the allowed number of job listings per month for employer/contractor plans.
    },
    agencyJobPostLimits: {
      customer: { type: Number, default: 0 },
      agency: { type: Number, default: 0 },
    },
    employerJobPostLimits: {
      agency: { type: Number, default: 0 },
      candidate: { type: Number, default: 0 },
    },
    // Save limits for profiles, jobs, and drafts
    totalSavesLimit: {
      type: Number,
      min: 0,
      default: null,
      // null = unlimited, number = monthly cap
      // Applies to employer and contractor plans
    },
    saveProfilesLimit: {
      type: Number,
      min: 0,
      default: null,
      // Monthly limit for saving profiles
    },
    saveJobsLimit: {
      type: Number,
      min: 0,
      default: null,
      // Monthly limit for saving job listings
    },
    saveDraftsLimit: {
      type: Number,
      min: 0,
      default: null,
      // Monthly limit for saving drafts
    },
    inviteSendLimit: {
      type: Schema.Types.Mixed,
      default: 0,
      // Can be number (0 by default) or { worker: number, employer: number, contractor: number }
      // 0 = no limit allowed, null = unlimited
    },
    viewProfileLimit: {
      type: Schema.Types.Mixed,
      default: 0,
      // Can be number (0 by default) or { worker: number, employer: number, contractor: number }
      // 0 = no limit allowed, null = unlimited
    },
    contactUnlockLimit: {
      type: Schema.Types.Mixed,
      default: 0,
      // Can be number (0 by default) or { worker: number, employer: number, contractor: number }
      // 0 = no limit allowed, null = unlimited
    },
    saveProfileLimit: {
      type: Schema.Types.Mixed,
      default: 0,
      // Can be number (0 by default) or { worker: number, employer: number, contractor: number }
      // 0 = no limit allowed, null = unlimited
    },
    status: {
      type: String,
      enum: Object.values(PlanStatus),
      default: PlanStatus.INACTIVE,
      index: true,
    },
    isRecommended: {
      type: Boolean,
      default: false,
    },
    isPopular: {
      type: Boolean,
      default: false,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    jobViewPerMonth: {
      type: Number,
      min: 0,
      default: 20,
    },
  },
  { timestamps: true },
);

// Filter by user type (worker, employer, contractor)
SubscriptionPlanSchema.index({ userType: 1 });

// Sorting/filtering recommended plans
SubscriptionPlanSchema.index({ isRecommended: 1 });

// Compound index for listing plans for a specific user type + status
SubscriptionPlanSchema.index({ userType: 1, status: 1 });

// Optional: for UI rendering/filtering in dashboards
SubscriptionPlanSchema.index({ billingCycle: 1 });

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  "SubscriptionPlan",
  SubscriptionPlanSchema,
);
