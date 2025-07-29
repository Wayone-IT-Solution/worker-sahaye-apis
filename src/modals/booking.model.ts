import { Schema, model, Document, Types } from "mongoose";

export type PaymentStatus = "pending" | "success" | "failed" | "refunded";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface IBooking extends Document {
  date: Date;
  notes?: string;
  endTime: string;
  startTime: string;
  user: Types.ObjectId;
  status: BookingStatus;
  timeslotId: Types.ObjectId;
  assistant: Types.ObjectId;
  payment: {
    paidAt?: Date;
    amount: number;
    method?: string;
    refundId?: string;
    paymentId?: string;
    status: PaymentStatus;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    assistant: {
      type: Schema.Types.ObjectId,
      ref: "PersonalAssistant",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timeslotId: { type: Schema.Types.ObjectId, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    payment: {
      amount: { type: Number, required: true },
      paymentId: { type: String },
      method: { type: String }, // e.g., "UPI", "Card", "Razorpay"
      status: {
        type: String,
        enum: ["pending", "success", "failed", "refunded"],
        default: "pending",
      },
      paidAt: { type: Date },
      refundId: { type: String },
    },
  },
  { timestamps: true }
);

export const Booking = model<IBooking>("Booking", BookingSchema);
