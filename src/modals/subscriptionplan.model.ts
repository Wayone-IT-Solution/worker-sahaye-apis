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

export enum Currency {
  INR = "INR",
}

export enum PlanStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface IFeature {
  key: string;
  name: string;
  description?: string;
}

export interface ISubscriptionPlan extends Document {
  name: string;
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
  features: IFeature[];
  isRecommended: boolean;
  billingCycle: BillingCycle;
  createdAt: Date;
  updatedAt: Date;
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
      enum: Object.values(Currency),
      default: Currency.INR,
    },
    billingCycle: {
      type: String,
      required: true,
      enum: Object.values(BillingCycle),
    },
    features: [
      {
        key: { type: String, required: true, index: true },
        name: { type: String, required: true },
        description: { type: String },
      },
    ],
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
  {
    timestamps: true,
  }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  "SubscriptionPlan",
  SubscriptionPlanSchema
);
