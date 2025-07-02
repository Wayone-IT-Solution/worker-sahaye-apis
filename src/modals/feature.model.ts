import { Schema, model, Document } from "mongoose";

export enum FeatureStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DEPRECATED = "deprecated",
}

export enum FeatureTarget {
  WORKER = "worker",
  EMPLOYER = "employer",
  CONTRACTOR = "contractor",
}

export interface IFeature extends Document {
  key: string;
  name: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  badgeKey?: string;
  description?: string;
  status: FeatureStatus;
  visibleTo: FeatureTarget;
}

const FeatureSchema = new Schema<IFeature>(
  {
    key: {
      trim: true,
      index: true,
      type: String,
      unique: true,
      required: true,
      maxlength: 100,
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    icon: {
      type: String,
      maxlength: 200,
    },
    badgeKey: {
      type: String,
      index: true,
    },
    visibleTo: {
      required: true,
      type: String,
      default: FeatureTarget.WORKER,
      enum: Object.values(FeatureTarget),
    },
    status: {
      index: true,
      type: String,
      default: FeatureStatus.ACTIVE,
      enum: Object.values(FeatureStatus),
    },
  },
  { timestamps: true }
);

export const Feature = model<IFeature>("Feature", FeatureSchema);
