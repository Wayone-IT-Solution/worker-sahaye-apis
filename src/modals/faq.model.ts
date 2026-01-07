import { IFaqCategory } from "./faqcategory.model";
import mongoose, { Schema, Document, model } from "mongoose";

/**
 * Visibility types for FAQ
 * "all" = Show to all users (general/public)
 * "brand", "influencer", "videographer", "user" = Show only to specific user types
 */
export type FaqVisibility = "all" | "worker" | "contractor" | "employer";

/**
 * FAQ Schema & Interface
 */
export interface IFaq extends Document {
  answer: string;
  createdAt: Date;
  updatedAt: Date;
  question: string;
  isActive: boolean;
  pageSlug?: string;
  category: mongoose.Types.ObjectId | IFaqCategory;
  visibilityFor?: FaqVisibility; // Single visibility type - visible to specific user type or all
}

const FaqSchema = new Schema<IFaq>(
  {
    isActive: { type: Boolean, default: true },
    answer: { type: String, required: true, trim: true },
    question: { type: String, required: true, trim: true },
    pageSlug: { type: String, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "FaqCategory", required: true },
    visibilityFor: {
      type: String,
      enum: ["all", "worker", "contractor", "employer"],
      default: "all", // By default, visible to all users
    },
  },
  { timestamps: true }
);

export const Faq = mongoose.models.Faq || model<IFaq>("Faq", FaqSchema);
