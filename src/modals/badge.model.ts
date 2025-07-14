import mongoose, { Schema, Document, Types } from "mongoose";

export enum UserType {
  WORKER = "worker",
  EMPLOYER = "employer",
  CONTRACTOR = "contractor",
}

export enum BadgeAwardType {
  MANUAL = "Manual", // Admin assigns
  AUTOMATIC = "Automatic", // Based on conditions like signup, activity, etc.
}

export interface IBadge extends Document {
  name: string;
  slug: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  description?: string;
  userTypes: UserType[];
  awardType: BadgeAwardType;
}

const BadgeSchema = new Schema<IBadge>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    icon: { type: String },
    userTypes: {
      type: [String],
      enum: Object.values(UserType),
      required: true,
      index: true,
    },
    awardType: {
      type: String,
      enum: Object.values(BadgeAwardType),
      default: BadgeAwardType.MANUAL,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// 🔄 Pre-save hook to auto-generate slug
BadgeSchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, ""); // remove special characters
  }
  next();
});

BadgeSchema.index({ name: 1 });
BadgeSchema.index({ slug: 1 });
BadgeSchema.index({ awardType: 1 });

export const Badge = mongoose.model<IBadge>("Badge", BadgeSchema);
