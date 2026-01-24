import mongoose, { Schema, Document, Types } from "mongoose";

export enum SubscriptionStatus {
  ACTIVE = "active",
  CANCELLED = "cancelled",
  FAILED = "failed",
}

export interface ISubscription extends Document {
  user: Types.ObjectId;
  bundle: Types.ObjectId;
  amount: number;
  status: SubscriptionStatus;
  startDate: Date;
  nextBillingDate: Date;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bundle: { type: Schema.Types.ObjectId, ref: "BadgeBundle", required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
    },
    startDate: { type: Date, default: Date.now },
    nextBillingDate: { type: Date, required: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  SubscriptionSchema
);
