import { Schema, model, Types, Document } from "mongoose";

export enum PlanEnrollmentStatus {
  ACTIVE = "active",
  FAILED = "failed",
  EXPIRED = "expired",
  PENDING = "pending",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
}

export enum PlanPaymentGateway {
  FREE = "free",
  RAZORPAY = "razorpay",
}

export enum PlanPaymentStatus {
  FAILED = "failed",
  SUCCESS = "success",
  PENDING = "pending",
  REFUNDED = "refunded",
}

export interface IEnrolledPlan extends Document {
  user: Types.ObjectId;
  plan: Types.ObjectId;
  enrolledAt: Date;
  expiredAt?: Date;
  refundedAt?: Date;
  refundReason?: string;
  totalAmount: number;
  finalAmount: number;
  paymentDetails?: {
    paidAt?: Date;
    amount: number;
    currency: string;
    paymentId?: string;
    status: PlanPaymentStatus;
    gateway: PlanPaymentGateway;
  };
  status: PlanEnrollmentStatus;
}

const PlanPaymentDetailsSchema = new Schema(
  {
    gateway: {
      type: String,
      enum: Object.values(PlanPaymentGateway),
    },
    amount: { type: Number },
    paymentId: { type: String },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      default: PlanPaymentStatus.PENDING,
      enum: Object.values(PlanPaymentStatus),
    },
    paidAt: { type: Date },
  },
  { _id: false }
);

const EnrolledPlanSchema = new Schema<IEnrolledPlan>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: {
      required: true,
      ref: "SubscriptionPlan",
      type: Schema.Types.ObjectId,
    },
    enrolledAt: { type: Date, default: Date.now },
    expiredAt: { type: Date },
    refundedAt: { type: Date },
    refundReason: { type: String },
    totalAmount: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    paymentDetails: { type: PlanPaymentDetailsSchema },
    status: {
      type: String,
      default: PlanEnrollmentStatus.PENDING,
      enum: Object.values(PlanEnrollmentStatus),
    },
  },
  { timestamps: true }
);

EnrolledPlanSchema.index({ user: 1, plan: 1 }, { unique: true });

export const EnrolledPlan = model<IEnrolledPlan>(
  "EnrolledPlan",
  EnrolledPlanSchema
);
