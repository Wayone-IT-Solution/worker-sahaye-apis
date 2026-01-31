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
  pointsRedeemed?: number;
  pointsValue?: number;
  pointsRefunded?: boolean;
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
    pointsRedeemed: { type: Number, default: 0 },
    pointsValue: { type: Number, default: 0 },
    pointsRefunded: { type: Boolean, default: false },
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

EnrolledPlanSchema.index({ user: 1, status: 1 });
// Useful for filtering active/enrolled/cancelled plans per user

EnrolledPlanSchema.index({ plan: 1, status: 1 });
// Efficient when querying all users under a specific plan & status

EnrolledPlanSchema.index({ "paymentDetails.paymentId": 1 }, { sparse: true });
// Speeds up lookup by payment ID (Razorpay use case)

EnrolledPlanSchema.index({ enrolledAt: -1 });
// For sorting or filtering enrollments by date

EnrolledPlanSchema.index({ status: 1 });
// If you're querying by status often for dashboards/reports

EnrolledPlanSchema.index({ expiredAt: 1 }, { sparse: true });
// Helps identify expired plans if your app runs cleanup/cron jobs

EnrolledPlanSchema.index({ refundedAt: -1 }, { sparse: true });
EnrolledPlanSchema.index({ "paymentDetails.status": 1 });

export const EnrolledPlan = model<IEnrolledPlan>(
  "EnrolledPlan",
  EnrolledPlanSchema
);
