import mongoose, { Schema, Document, Types } from "mongoose";

export type PromoTarget = "rider" | "driver";
export type PromoType = "flat" | "percentage";

export interface IPromotion extends Document {
  code: string;
  value: number;
  validTo: Date;
  type: PromoType;
  createdAt: Date;
  updatedAt: Date;
  validFrom: Date;
  isActive: boolean;
  target: PromoTarget;
  description?: string;
  minRideAmount?: number;
  usedBy: Types.ObjectId[];
  usageLimitPerUser: number;
  globalUsageLimit?: number;
  maxDiscountAmount?: number;
}

const PromotionSchema: Schema = new Schema<IPromotion>(
  {
    code: {
      trim: true,
      type: String,
      unique: true,
      required: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["flat", "percentage"],
    },
    value: {
      type: Number,
      required: true,
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
    },
    minRideAmount: {
      type: Number,
      default: 0,
    },
    target: {
      type: String,
      required: true,
      enum: ["passenger", "driver"],
    },
    usageLimitPerUser: {
      type: Number,
      default: 1,
    },
    globalUsageLimit: {
      type: Number,
      default: null,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "Passenger",
        default: [],
      },
    ],
    // referralBonus: {
    //   enabled: { type: Boolean, default: false },
    //   bonusAmount: { type: Number, default: 0 },
    // },
  },
  { timestamps: true },
);

export const Promotion = mongoose.model<IPromotion>(
  "Promotion",
  PromotionSchema,
);
