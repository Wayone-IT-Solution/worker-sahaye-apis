import mongoose, { Document, Schema } from "mongoose";

// 1. Define interface
export interface CandidateBranding extends Document {
  title: string;
  description: string;
  howToBrand: {
    step: number;
    title: string;
    description: string;
  }[];
  premiumFeatures: {
    title: string;
    features: string[];
  };
  benefits: string[];
  updatedAt: Date;
}

// 2. Create schema
const CandidateBrandingSchema = new Schema<CandidateBranding>({
  title: { type: String, required: true }, // "Candidate Branding"
  description: { type: String, required: true },
  howToBrand: [
    {
      step: { type: Number, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
    },
  ],
  premiumFeatures: {
    title: { type: String, required: true },
    features: [{ type: String, required: true }],
  },
  benefits: [{ type: String, required: true }],
  updatedAt: { type: Date, default: Date.now },
});

// 3. Ensure only one document exists
CandidateBrandingSchema.pre("save", async function (next) {
  const count = await CandidateBrandingContentModel.countDocuments();
  if (count >= 1 && this.isNew) {
    throw new Error("Only one Candidate Branding document is allowed.");
  }
  next();
});

// 4. Export model
export const CandidateBrandingContentModel = mongoose.model<CandidateBranding>(
  "CandidateBrandingContent",
  CandidateBrandingSchema
);
