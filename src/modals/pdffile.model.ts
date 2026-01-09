import mongoose, { Schema, Document, Types } from "mongoose";
import { IHeader } from "./header.model";

export interface IPdf extends Document {
  url: string;
  header: Types.ObjectId | IHeader;
  order: number;
}

const PdfSchema = new Schema<IPdf>(
  {
    url: {
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
  },
  { timestamps: true }
);

export const Pdf = mongoose.model<IPdf>("Pdf", PdfSchema);
