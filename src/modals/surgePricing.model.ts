import mongoose, { Schema, Document } from "mongoose";

export interface ISurgePricing extends Document {
  title: string;
  days: number[];
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  startTime: string;
  multiplier: number;
  distanceTo?: number;
  distanceFrom?: number;
}

const SurgePricingSchema = new Schema<ISurgePricing>(
  {
    title: { type: String, required: true },
    endTime: { type: String, required: true },
    distanceFrom: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startTime: { type: String, required: true },
    distanceTo: { type: Number, default: 9999 },
    multiplier: { type: Number, required: true, min: 1 },
    days: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
  },
  { timestamps: true }
);

export const SurgePricing = mongoose.model<ISurgePricing>(
  "SurgePricing",
  SurgePricingSchema
);

export const getSurgeMultiplier = async (distance: number): Promise<number> => {
  const now = new Date();
  const day = now.getDay();
  const time = now.toTimeString().slice(0, 5);

  const surge = await SurgePricing.findOne({
    isActive: true,
    days: day,
    distanceFrom: { $lte: distance },
    distanceTo: { $gte: distance },
    startTime: { $lte: time },
    endTime: { $gte: time },
  }).sort({ multiplier: -1 });

  return surge?.multiplier || 1;
};

export const getSurgePricing = async (): Promise<ISurgePricing[]> => {
  return await SurgePricing.find({ isActive: true });
};
