import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPlanFeatureMapping extends Document {
  amount: number;
  isEnabled: string;
  planId: Types.ObjectId;
  featureId: Types.ObjectId;
}

const PlanFeatureMappingSchema = new Schema<IPlanFeatureMapping>(
  {
    planId: {
      required: true,
      ref: "SubscriptionPlan",
      type: Schema.Types.ObjectId,
    },
    featureId: {
      ref: "Feature",
      required: true,
      type: Schema.Types.ObjectId,
    },
    amount: {
      min: 0,
      type: Number,
      required: true,
    },
    isEnabled: {
      type: String,
      default: "active",
    },
  },
  { timestamps: true }
);

PlanFeatureMappingSchema.index({ planId: 1, featureId: 1 }, { unique: true });

export const PlanFeatureMapping = mongoose.model<IPlanFeatureMapping>(
  "PlanFeatureMapping",
  PlanFeatureMappingSchema
);
