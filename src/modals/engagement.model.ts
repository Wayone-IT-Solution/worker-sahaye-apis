import { Schema, model, Types, Document } from "mongoose";

export enum EngagementType {
  INVITE = "invite",
  VIEW_PROFILE = "viewProfile",
  CONTACT_UNLOCK = "contactUnlock",
}

export enum RecipientType {
  WORKER = "worker",
  EMPLOYER = "employer",
  CONTRACTOR = "contractor",
}

export interface IEngagement extends Document {
  initiator: Types.ObjectId; // who initiated the engagement
  recipient: Types.ObjectId; // who received the engagement
  recipientType: RecipientType; // type of recipient (worker/employer/contractor)
  engagementType: EngagementType; // Type of engagement
  message?: string; // optional custom message
  context?: string; // e.g., "job", "event", "group"
}

const EngagementSchema = new Schema<IEngagement>(
  {
    initiator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: Object.values(RecipientType),
      required: true,
      index: true,
    },
    engagementType: {
      type: String,
      enum: Object.values(EngagementType),
      required: true,
      index: true,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    context: {
      type: String, // can be used to categorize engagements
      enum: ["job", "event", "custom"],
      default: "job",
    },
  },
  { timestamps: true },
);

// Compound index: one initiator cannot perform same engagement type with same recipient multiple times
EngagementSchema.index(
  { initiator: 1, recipient: 1, engagementType: 1, context: 1 },
  { unique: true },
);

// To quickly query engagements received by a user
EngagementSchema.index({ recipient: 1, engagementType: 1 });

// To quickly query engagements sent by a user
EngagementSchema.index({ initiator: 1, engagementType: 1 });

// To quickly query engagements by recipient type
EngagementSchema.index({ recipientType: 1, engagementType: 1 });

export const Engagement = model<IEngagement>("Engagement", EngagementSchema);

// Backward compatibility exports
export const Invite = Engagement;
export type IInvite = IEngagement;
