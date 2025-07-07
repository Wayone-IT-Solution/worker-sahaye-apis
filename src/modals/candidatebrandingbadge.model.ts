import { Schema, model, Document, Types } from "mongoose";

export interface ICandidateBrandingBadge extends Document {
  badge: any;
  metaData?: any;
  assignedAt: Date;
  user: Types.ObjectId;
  status: "active" | "pending" | "rejected";
  earnedBy: "subscription" | "manual" | "system";
}

const CandidateBrandingBadgeSchema = new Schema<ICandidateBrandingBadge>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    badge: {
      type: String,
      required: true,
    },
    earnedBy: {
      type: String,
      required: true,
      enum: ["subscription", "manual", "system"],
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "pending", "rejected"],
    },
    assignedAt: { type: Date, default: Date.now },
    metaData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

CandidateBrandingBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });
CandidateBrandingBadgeSchema.index({ user: 1, status: 1 });
CandidateBrandingBadgeSchema.index({ earnedBy: 1, status: 1 });
CandidateBrandingBadgeSchema.index({ assignedAt: -1 });
CandidateBrandingBadgeSchema.index({ badge: 1 });

export const CandidateBrandingBadge = model<ICandidateBrandingBadge>(
  "CandidateBrandingBadge",
  CandidateBrandingBadgeSchema
);
