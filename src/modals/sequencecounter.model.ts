import mongoose, { Document, Schema } from "mongoose";

export interface ISequenceCounter extends Document {
  key: string;
  seq: number;
  updatedAt: Date;
  createdAt: Date;
}

const SequenceCounterSchema = new Schema<ISequenceCounter>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export const SequenceCounter = mongoose.model<ISequenceCounter>(
  "SequenceCounter",
  SequenceCounterSchema
);

