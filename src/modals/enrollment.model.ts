import { Schema, model, Types, Document } from "mongoose";

export enum EnrollmentStatus {
  ACTIVE = "active",
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
  appliedCoupon?: any;
  paymentDetails?: any;
  user: Types.ObjectId;
  course: Types.ObjectId;
  status: EnrollmentStatus;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    enrolledAt: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    status: {
      type: String,
      default: EnrollmentStatus.ACTIVE,
      enum: Object.values(EnrollmentStatus),
    },
    appliedCoupon: {},
    paymentDetails: {},
  },
  { timestamps: true }
);

EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export const Enrollment = model<IEnrollment>("Enrollment", EnrollmentSchema);
