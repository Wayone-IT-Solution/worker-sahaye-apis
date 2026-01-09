import mongoose, { Schema, Document, Types } from "mongoose";

// Enum for parent
export enum ParentEnum {
  ESIC = "ESIC",
  EPFO = "EPFO",
  LWF = "LWF",
}

// Interface for Header
export interface IHeader extends Document {
  parent: ParentEnum;
  title: string;
  icon?: string;
  description?: string;
  basic_info?: string;
}

// Schema definition
const HeaderSchema = new Schema<IHeader>(
  {
    parent: {
      type: String,
      required: true,
      enum: Object.values(ParentEnum),
    },
    title: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
    },
    description: {
      type: String,
    },
    basic_info: {
      type: String,
    },
  },
  { timestamps: true }
);

// Export the model
export const Header = mongoose.model<IHeader>("Header", HeaderSchema);
