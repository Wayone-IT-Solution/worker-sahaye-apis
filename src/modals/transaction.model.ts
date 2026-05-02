import mongoose, { Schema, Document, Types } from "mongoose";

export enum TransactionType {
  SUBSCRIPTION_PLAN = "subscription_plan",
  BADGE_BUNDLE = "badge_bundle",
  INDIVIDUAL_BADGE = "individual_badge",
}

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
}

export enum PaymentGateway {
  RAZORPAY = "razorpay",
  FREE = "free",
  ADMIN_ASSIGN = "admin_assign",
}

export interface ITransaction extends Document {
  user: Types.ObjectId;
  transactionType: TransactionType;
  itemId: Types.ObjectId; // Reference to SubscriptionPlan, BadgeBundle, or Badge
  itemName: string; // Name of the item purchased
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentGateway: PaymentGateway;
  paymentId?: string; // Razorpay payment ID
  orderId?: string; // Razorpay order ID
  refundId?: string; // Razorpay refund ID
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  transactionDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      index: true,
    },
    paymentGateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      required: true,
    },
    paymentId: {
      type: String,
    },
    orderId: {
      type: String,
    },
    refundId: {
      type: String,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    refundReason: {
      type: String,
    },
    refundedAt: {
      type: Date,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
TransactionSchema.index({ user: 1, transactionDate: -1 });
TransactionSchema.index({ transactionType: 1, status: 1 });
TransactionSchema.index({ paymentGateway: 1, status: 1 });

export const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  TransactionSchema
);