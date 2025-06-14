import mongoose, { Schema, model, Document, Types } from "mongoose";

/** Priority Tag Constants */
export const HIGH_PRIORITY_TAGS = [
  "ride_reassigned",
  "payment_failed",
  "ride_missed",
  "vehicle_issue",
  "driver_no_show",
  "account_suspended",
  "refund_requested",
  "technical_issue",
  "escalated",
  "resolved",
] as const;

export const MEDIUM_PRIORITY_TAGS = [
  "ride_delayed",
  "partial_payment",
  "customer_late",
  "ride_rescheduled",
  "feedback_negative",
  "support_call_requested",
  "customer_complaint",
  "awaiting_response",
  "in_progress",
  "driver_arriving_late",
] as const;

export const LOW_PRIORITY_TAGS = [
  "feedback_positive",
  "regular_rider",
  "promotion_applied",
  "ride_cancelled_by_rider",
  "ride_cancelled_by_driver",
  "loyal_customer",
] as const;

export const CRITICAL_PRIORITY_TAGS = [
  "ride_reassigned",
  "payment_failed",
  "driver_no_show",
  "vehicle_issue",
  "security_breach",
  "account_suspended",
  "fraudulent_activity",
] as const;

/** Enums */
type Priority = "low" | "medium" | "high" | "critical";
type Status =
  | "open"
  | "closed"
  | "on_hold"
  | "resolved"
  | "in_progress"
  | "re_assigned";
type ActionType = "commented" | "status_changed" | "resolved";
type UserType = "User" | "Agent";
type Tag =
  | (typeof HIGH_PRIORITY_TAGS)[number]
  | (typeof MEDIUM_PRIORITY_TAGS)[number]
  | (typeof LOW_PRIORITY_TAGS)[number]
  | (typeof CRITICAL_PRIORITY_TAGS)[number];

/** Interfaces */
interface IInteraction {
  content?: string;
  timestamp?: Date;
  action: ActionType;
  receiverType: UserType;
  initiatorType: UserType;
  receiver: Types.ObjectId;
  initiator: Types.ObjectId;
}

export interface ITicket extends Document {
  tags: Tag[];
  title: string;
  status: Status;
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  priority: Priority;
  interactions: any[];
  description: string;
  resolutionDate?: Date;
  requester: Types.ObjectId;
  assignee?: Types.ObjectId;
  timeToResolve?: number | null;
  relatedTickets?: Types.ObjectId[];
}

/** Subdocument Schema */
const InteractionSchema = new Schema<IInteraction>(
  {
    initiator: {
      type: Schema.Types.ObjectId,
      refPath: "initiatorType",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      refPath: "receiverType",
      required: true,
    },
    initiatorType: {
      type: String,
      enum: ["Passenger", "Agent"],
      required: true,
    },
    receiverType: {
      type: String,
      enum: ["Passenger", "Agent"],
      required: true,
    },
    action: {
      type: String,
      enum: ["commented", "status_changed", "resolved"],
      required: true,
    },
    content: {
      type: String,
      required: function (this: IInteraction) {
        return this.action === "commented";
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

/** Main Ticket Schema */
const TicketSchema = new Schema<ITicket>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requester: {
      type: Schema.Types.ObjectId,
      ref: "Passenger",
      required: true,
    },
    assignee: { type: Schema.Types.ObjectId, ref: "Agent" },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "open",
        "closed",
        "on_hold",
        "resolved",
        "in_progress",
        "re_assigned",
      ],
      default: "open",
      required: true,
    },
    tags: [{ type: String, trim: true }],
    dueDate: { type: Date },
    resolutionDate: { type: Date },
    interactions: [InteractionSchema],
    relatedTickets: [{ type: Schema.Types.ObjectId, ref: "Ticket" }],
  },
  { timestamps: true },
);

/** Virtual Field */
TicketSchema.virtual("timeToResolve").get(function (this: ITicket) {
  return this.resolutionDate && this.createdAt
    ? Math.abs(this.resolutionDate.getTime() - this.createdAt.getTime())
    : null;
});

/** Export Model */
const Ticket = model<ITicket>("Ticket", TicketSchema);
export default Ticket;
