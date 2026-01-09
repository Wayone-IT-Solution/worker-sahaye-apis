import { Schema, model, Document, Types } from "mongoose";

export type PaymentStatus = "pending" | "success" | "failed" | "refunded";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface IBooking extends Document {
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  metaDetails?: any;
  totalAmount: number;
  paymentDetails: any;
  user: Types.ObjectId;
  status: BookingStatus;
  assistant: Types.ObjectId;
  timeslotId: Types.ObjectId;
  paymentStatus: PaymentStatus;
  supportService?: Types.ObjectId;
  canCall: boolean;
}

const BookingSchema = new Schema<IBooking>(
  {
    assistant: {
      ref: "PersonalAssistant",
      type: Schema.Types.ObjectId,
    },
    user: {
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId,
    },
    supportService: {
      ref: "SupportService",
      type: Schema.Types.ObjectId,
    },
    notes: { type: String },
    timeslotId: { type: Schema.Types.ObjectId },
    totalAmount: { type: Number, default: 0, required: true },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "confirmed", "completed", "cancelled"],
    },
    paymentStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "success", "failed", "refunded"],
    },
    canCall: {
      type: Boolean,
      default: true,
    },
    metaDetails: {},
    paymentDetails: {},
  },
  { timestamps: true }
);

export const Booking = model<IBooking>("Booking", BookingSchema);
