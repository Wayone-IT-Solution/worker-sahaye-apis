import mongoose, { Schema, Document, model } from "mongoose";
import { FaqRole, FAQ_ROLES } from "../utils/faq";

/**
 * FAQ Category Schema & Interface
 */
export interface IFaqCategory extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  visibleFor: FaqRole[];
}

const FaqCategorySchema = new Schema<IFaqCategory>(
  {
    description: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    visibleFor: {
      type: [String],
      enum: FAQ_ROLES,
      default: ["all"],
      index: true,
    },
  },
  { timestamps: true }
);

FaqCategorySchema.index({ name: 1 });

export const FaqCategory =
  mongoose.models.FaqCategory || model<IFaqCategory>("FaqCategory", FaqCategorySchema);
