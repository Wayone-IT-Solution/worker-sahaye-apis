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
  cycle: BillingCycle
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
      date.setDate(date.getDate() + 1); // or undefined if no expiry
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
  monthlyJobListingLimit?: number;
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
      default: null,
      // Represents the allowed number of job listings per month for employer/contractor plans.
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
  },
  { timestamps: true }
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
  SubscriptionPlanSchema
);
