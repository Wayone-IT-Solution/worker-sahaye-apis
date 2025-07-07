import mongoose, { Document, Schema, Types } from "mongoose";

export enum ConnectionStatus {
  REMOVED = "removed",
  PENDING = "pending",
  ACCEPTED = "accepted",
  CANCELLED = "cancelled",
}

export interface IConnection extends Document {
  status: ConnectionStatus;
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  history: Array<{
    notes?: string;
    changedAt: Date;
    status: ConnectionStatus;
    changedBy: Types.ObjectId;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    requester: {
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
    status: {
      type: String,
      enum: Object.values(ConnectionStatus),
      default: ConnectionStatus.PENDING,
      required: true,
    },
    history: [
      new Schema(
        {
          status: {
            type: String,
            enum: Object.values(ConnectionStatus),
            required: true,
          },
          changedAt: {
            type: Date,
            default: Date.now,
          },
          changedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          notes: {
            type: String,
          },
        },
        { _id: false }
      ),
    ],
  },
  { timestamps: true }
);

// Prevent duplicate connection edges (directional)
ConnectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// 📌 Query mutual or reverse-directional connections
ConnectionSchema.index(
  { recipient: 1, requester: 1, status: 1 },
  { name: "recipient_requester_status_idx" }
);

// 📌 Filter by status (e.g., pending requests)
ConnectionSchema.index({ status: 1 }, { name: "status_only_idx" });

// 📌 For efficient retrieval of a user's all connections
ConnectionSchema.index(
  { requester: 1, status: 1 },
  { name: "requester_status_idx" }
);
ConnectionSchema.index(
  { recipient: 1, status: 1 },
  { name: "recipient_status_idx" }
);

// 📌 Indexing `history.status` if filtering on nested history (optional)
ConnectionSchema.index(
  { "history.status": 1 },
  { sparse: true, name: "history_status_idx" }
);

ConnectionSchema.index(
  { requester: 1, recipient: 1, status: 1 },
  { name: "full_directional_status_idx" }
);

/**
 * Pre-save: append to history when status or categories change
 */
ConnectionSchema.pre<IConnection>("save", function (next) {
  if (this.isModified("status") || this.isModified("categories")) {
    this.history.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.requester,
      notes: this.isModified("status")
        ? `Status changed to ${this.status}`
        : undefined,
    });
  }
  next();
});

/**
 * Static: fetch mutual connection record between two users
 */
ConnectionSchema.statics.findBetween = function (
  userA: Types.ObjectId,
  userB: Types.ObjectId
) {
  return this.findOne({
    $or: [
      { requester: userA, recipient: userB, status: ConnectionStatus.ACCEPTED },
      { requester: userB, recipient: userA, status: ConnectionStatus.ACCEPTED },
    ],
  });
};

export const ConnectionModel = mongoose.model<IConnection>(
  "Connection",
  ConnectionSchema
);
