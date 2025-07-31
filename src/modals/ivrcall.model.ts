import mongoose, { Schema, Document, Types } from "mongoose";

export enum CallStatus {
  ANSWERED = "answered",
  NO_ANSWER = "no_answer",
  INITIATED = "initiated",
  IN_PROGRESS = "in_progress",
}

export interface IVRCall extends Document {
  createdAt: Date;
  updatedAt: Date;
  status: CallStatus;
  userId: Types.ObjectId;
  pickedBy?: Types.ObjectId;
  featureId: Types.ObjectId;
  callRecordingUrl?: string;
  metadata?: Record<string, any>;
}

const IVRCallSchema = new Schema<IVRCall>(
  {
    callRecordingUrl: { type: String },
    metadata: { type: Schema.Types.Mixed },
    pickedBy: { type: Schema.Types.ObjectId, ref: "Agent" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    featureId: { type: Schema.Types.ObjectId, ref: "Feature", required: true },
    status: { type: String, enum: Object.values(CallStatus), default: CallStatus.INITIATED },
  },
  { timestamps: true }
);

export const IVRCallModel = mongoose.model<IVRCall>("IVRCall", IVRCallSchema);
