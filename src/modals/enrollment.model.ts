import { Schema, model, Types, Document } from "mongoose";

export enum EnrollmentStatus {
  ACTIVE = "active",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum PaymentGateway {
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
  totalAmount: number;
  finalAmount: number;
  refundReason?: string;
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
    enrolledAt: { type: Date, default: Date.now },
    totalAmount: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    paymentDetails: { type: PaymentDetailsSchema },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    status: {
      type: String,
      default: EnrollmentStatus.ACTIVE,
      enum: Object.values(EnrollmentStatus),
    },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export const Enrollment = model<IEnrollment>("Enrollment", EnrollmentSchema);
