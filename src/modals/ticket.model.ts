import mongoose, { Schema, model, Document, Types } from "mongoose";

/** Priority Tag Constants for Job Portal System */
export const HIGH_PRIORITY_TAGS = [
  "job_posting_failed",
  "payment_issue",
  "interview_no_show",
  "profile_verification_failed",
  "account_suspended",
  "employer_fraud_reported",
  "resume_not_accessible",
  "urgent_hiring_blocked",
  "security_issue",
  "escalated",
] as const;

export const MEDIUM_PRIORITY_TAGS = [
  "application_lost",
  "candidate_feedback_negative",
  "job_posting_pending_approval",
  "interview_reschedule_requested",
  "profile_incomplete",
  "inappropriate_job_listing",
  "support_requested",
  "system_slow",
  "candidate_complaint",
  "awaiting_employer_response",
] as const;

export const LOW_PRIORITY_TAGS = [
  "profile_updated_successfully",
  "application_withdrawn",
  "job_posting_closed_by_employer",
  "positive_feedback",
  "casual_query",
  "promotion_applied",
  "new_feature_suggestion",
] as const;

export const CRITICAL_PRIORITY_TAGS = [
  "security_issue",
  "employer_fraud_reported",
  "payment_issue",
  "account_suspended",
  "resume_not_accessible",
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
      enum: ["User", "Agent"],
      required: true,
    },
    receiverType: {
      type: String,
      enum: ["User", "Agent"],
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
  { _id: false }
);

/** Main Ticket Schema */
const TicketSchema = new Schema<ITicket>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    tags: [
      {
        type: String,
        enum: [
          ...HIGH_PRIORITY_TAGS,
          ...MEDIUM_PRIORITY_TAGS,
          ...LOW_PRIORITY_TAGS,
          ...CRITICAL_PRIORITY_TAGS,
        ],
        trim: true,
      },
    ],
    dueDate: { type: Date },
    resolutionDate: { type: Date },
    interactions: [InteractionSchema],
    relatedTickets: [{ type: Schema.Types.ObjectId, ref: "Ticket" }],
  },
  { timestamps: true }
);

/** Virtual Field */
TicketSchema.virtual("timeToResolve").get(function (this: ITicket) {
  return this.resolutionDate && this.createdAt
    ? Math.abs(this.resolutionDate.getTime() - this.createdAt.getTime())
    : null;
});

// Basic filters & access
TicketSchema.index({ requester: 1 });      // Fetch tickets by user
TicketSchema.index({ assignee: 1 });       // Fetch tickets assigned to an agent
TicketSchema.index({ status: 1 });         // Filter by status
TicketSchema.index({ priority: 1 });       // Filter by priority
TicketSchema.index({ tags: 1 });           // Filter/search by tag
TicketSchema.index({ dueDate: 1 });        // Find overdue or due-soon tickets
TicketSchema.index({ resolutionDate: 1 }); // For SLA/metrics
TicketSchema.index({ createdAt: -1 });     // Sorting or recent tickets

// Compound indexes (frequently queried together)
TicketSchema.index({ assignee: 1, status: 1 });
TicketSchema.index({ requester: 1, createdAt: -1 });

/** Export Model */
const Ticket = model<ITicket>("Ticket", TicketSchema);
export default Ticket;
