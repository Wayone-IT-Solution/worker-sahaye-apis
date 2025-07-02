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

export const Endorsement = model<IEndorsement>("Endorsement", EndorsementSchema);
