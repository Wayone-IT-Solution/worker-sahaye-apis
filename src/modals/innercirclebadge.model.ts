import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInnerCircleBadge extends Document {
  name: string;
  description?: string;
  price: number;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  benefits?: string[];
  isActive: boolean;
}

const InnerCircleBadgeSchema = new Schema<IInnerCircleBadge>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    icon: {
      type: String,
      trim: true,
    },
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const InnerCircleBadge = mongoose.model<IInnerCircleBadge>(
  "InnerCircleBadge",
  InnerCircleBadgeSchema
);
