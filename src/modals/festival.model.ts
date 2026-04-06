import mongoose, { Schema, Document, model } from "mongoose";

export interface IFestival extends Document {
  date: string;
  note: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const FestivalSchema = new Schema<IFestival>(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Festival = model<IFestival>("Festival", FestivalSchema);
