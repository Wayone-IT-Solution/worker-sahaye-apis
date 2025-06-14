import { Schema, model, Document, Types } from "mongoose";

export enum RefundStatus {
  PENDING = "pending",
  REJECTED = "rejected",
  COMPLETED = "completed",
}

export interface IRefund extends Document {
  ride: Types.ObjectId; // Reference to the Ride being refunded
  user: Types.ObjectId; // The passenger/user requesting the refund
  amount: number; // Refund amount
  reason: string; // Reason for refund
  status: RefundStatus; // Refund status
  requestedAt: Date; // Date when the refund was requested
  completedAt?: Date; // Date when the refund was completed (if applicable)
  rejectedAt?: Date; // Date when the refund was rejected (if applicable)
  rejectionReason?: string; // Reason for rejecting the refund
}

const refundSchema = new Schema<IRefund>(
  {
    ride: { type: Schema.Types.ObjectId, ref: "Ride", required: true },
    user: { type: Schema.Types.ObjectId, ref: "Passenger", required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(RefundStatus),
      default: RefundStatus.PENDING,
    },
    requestedAt: { type: Date, default: Date.now },
    completedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true },
);

refundSchema.index({ ride: 1 });
export const Refund = model<IRefund>("Refund", refundSchema);
