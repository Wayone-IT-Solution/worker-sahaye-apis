import { Schema, model, Types, Document } from "mongoose";

export interface IInvite extends Document {
  inviter: Types.ObjectId; // who sent the invite
  invitee: Types.ObjectId; // who received the invite
  status: "pending" | "accepted" | "rejected" | "cancelled";
  message?: string; // optional custom message
  context?: string; // e.g., "job", "event", "group"
}

const InviteSchema = new Schema<IInvite>(
  {
    inviter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invitee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    context: {
      type: String, // can be used to categorize invites
      enum: ["job", "event", "custom"],
      default: "job",
    },
  },
  { timestamps: true }
);

// Compound index: one inviter cannot invite the same invitee for same context+relatedId multiple times
InviteSchema.index(
  { inviter: 1, invitee: 1, context: 1, relatedId: 1 },
  { unique: true }
);

// To quickly query invites received by a user
InviteSchema.index({ invitee: 1, status: 1 });

// To quickly query invites sent by a user
InviteSchema.index({ inviter: 1, status: 1 });

export const Invite = model<IInvite>("Invite", InviteSchema);
