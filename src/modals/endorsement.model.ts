import mongoose, { Schema, model, Document } from "mongoose";

export interface IEndorsement extends Document {
  createdAt: Date;
  updatedAt: Date;
  message?: string;
  fulfilled: boolean;
  endorsedBy: mongoose.Types.ObjectId;
  endorsedTo: mongoose.Types.ObjectId;
  connectionId: mongoose.Types.ObjectId;
}

const EndorsementSchema = new Schema<IEndorsement>(
  {
    message: {
      trim: true,
      type: String,
      maxlength: 500,
    },
    endorsedBy: {
      index: true,
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId,
    },
    endorsedTo: {
      index: true,
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId,
    },
    connectionId: {
      index: true,
      required: true,
      ref: "Connection",
      type: Schema.Types.ObjectId,
    },
    fulfilled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Prevent duplicate endorsements from the same user to the same recipient
EndorsementSchema.index(
  { endorsedBy: 1, endorsedTo: 1 },
  { unique: true }
);

EndorsementSchema.index({ endorsedTo: 1, fulfilled: 1 });
// Optimizes queries for endorsements a user has received, optionally filtered by fulfilled status

EndorsementSchema.index({ endorsedBy: 1, fulfilled: 1 });
// Speeds up finding endorsements made by a user and their status

EndorsementSchema.index({ connectionId: 1 });
// Efficient if checking endorsements by connection (e.g., within a specific relationship)

EndorsementSchema.index({ fulfilled: 1, createdAt: -1 });
// Helpful for reports or filtering unfulfilled/fulfilled endorsements by recent activity

export const Endorsement = model<IEndorsement>("Endorsement", EndorsementSchema);
