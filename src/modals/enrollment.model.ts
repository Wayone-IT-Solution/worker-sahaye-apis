import { Schema, model, Types, Document } from "mongoose";

export enum EnrollmentStatus {
  ACTIVE = "active",
  FAILED = "failed",
  PENDING = "pending",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum PaymentGateway {
  FREE = "free",
  RAZORPAY = "razorpay",
}

export enum PaymentStatus {
  FAILED = "failed",
  SUCCESS = "success",
  PENDING = "pending",
  REFUNDED = "refunded",
}

export interface IEnrollment extends Document {
  enrolledAt: Date;
  refundedAt?: Date;
  progress?: number;
  totalAmount: number;
  finalAmount: number;
  refundReason?: string;
  numberOfPeople: number;
  appliedCoupon?: {
    code: string;
    appliedAt: Date;
    discountAmount: number;
  };
  user: Types.ObjectId;
  paymentDetails?: any;
  course: Types.ObjectId;
  status: EnrollmentStatus;
}

const PaymentDetailsSchema = new Schema(
  {
    gateway: {
      type: String,
      enum: Object.values(PaymentGateway),
    },
    amount: { type: Number },
    paymentId: { type: String },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      default: PaymentStatus.PENDING,
      enum: Object.values(PaymentStatus),
    },
    paidAt: { type: Date },
  },
  { _id: false }
);

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    appliedCoupon: {},
    refundedAt: { type: Date },
    refundReason: { type: String },
    progress: { type: Number, default: 0 },
    enrolledAt: { type: Date, default: Date.now },
    totalAmount: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    paymentDetails: { type: PaymentDetailsSchema },
    numberOfPeople: { type: Number, default: 1, min: 1 },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    status: {
      type: String,
      default: EnrollmentStatus.PENDING,
      enum: Object.values(EnrollmentStatus),
    },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

EnrollmentSchema.index({ user: 1, status: 1 });
// Efficient filtering of enrollments per user (e.g., active, completed, refunded)

EnrollmentSchema.index({ course: 1, status: 1 });
// Useful for querying enrollments by course status (analytics, dashboards)

EnrollmentSchema.index({ enrolledAt: -1 });
// Optimized for sorting recent enrollments (e.g., activity feeds)

EnrollmentSchema.index({ "paymentDetails.paymentId": 1 }, { sparse: true });
// Quick lookup by payment ID (for Razorpay callbacks or verification)

EnrollmentSchema.index({ refundedAt: 1 }, { sparse: true });
// Helps identify refunded enrollments (for reports, cron jobs, or audits)

EnrollmentSchema.index({ status: 1 });
// Good for admin dashboards or enrollment overviews by status

EnrollmentSchema.index({ "paymentDetails.status": 1 });
// Useful if you often filter enrollments by payment status

EnrollmentSchema.index({ "appliedCoupon.code": 1 }, { sparse: true });
// To analyze coupon usage across enrollments

export const Enrollment = model<IEnrollment>("Enrollment", EnrollmentSchema);
