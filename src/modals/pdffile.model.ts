import mongoose, { Schema, Document, Types } from "mongoose";
import { IHeader } from "./header.model";

export interface IPdf extends Document {
  url: string;
  fileName: string;
  header: Types.ObjectId | IHeader;
  order: number;
  startDate?: Date;
  description?: string;
}

const PdfSchema = new Schema<IPdf>(
  {
    url: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    header: {
      type: Schema.Types.ObjectId,
      ref: "Header",
      required: true,
    },
    order: {
      type: Number,
      default: 1,
    },
    startDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const Pdf = mongoose.model<IPdf>("Pdf", PdfSchema);
