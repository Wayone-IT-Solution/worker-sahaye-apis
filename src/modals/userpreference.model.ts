import mongoose, { Schema, Document } from "mongoose";

export enum SalaryPeriod {
  DAILY = "daily",
  HOURLY = "hourly",
  YEARLY = "yearly",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  PROJECT_BASED = "project-based",
}

export interface IUserPreference extends Document {
  preferredLocations: string[];
  userId: mongoose.Types.ObjectId;
  jobRoles: mongoose.Types.ObjectId[];
  industryId?: mongoose.Types.ObjectId;
  subIndustryId?: mongoose.Types.ObjectId;
  salaryExpectation: {
    amount: number;
    frequency: SalaryPeriod;
  };
  updatedAt: Date;
  createdAt: Date;
  jobTypes: string[];
  workModes: string[];
  isWillingToRelocate: boolean;
  experienceLevel: string;
}

const UserPreferenceSchema: Schema = new Schema<IUserPreference>(
  {
    userId: {
      ref: "User",
      unique: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    jobRoles: {
      required: true,
      ref: "Function",
      type: [Schema.Types.ObjectId],
      default: [],
    },
    industryId: {
      ref: "Industry",
      type: Schema.Types.ObjectId,
    },
    subIndustryId: {
      ref: "SubIndustry",
      type: Schema.Types.ObjectId,
    },
    preferredLocations: { type: [String], default: [] },
    salaryExpectation: {
      amount: { type: Number, required: true },
      frequency: {
        type: String,
        default: SalaryPeriod.YEARLY,
        enum: Object.values(SalaryPeriod),
      },
    },
    jobTypes: {
      type: [String],
      default: [],
    },
    workModes: {
      type: [String],
      default: [],
    },
    experienceLevel: {
      type: String,
      default: "",
    },
    isWillingToRelocate: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes (removed duplicates)
UserPreferenceSchema.index({ preferredLocations: 1 });
UserPreferenceSchema.index({ jobTypes: 1 });
UserPreferenceSchema.index({ workModes: 1 });
UserPreferenceSchema.index({ experienceLevel: 1 });
UserPreferenceSchema.index({ "salaryExpectation.amount": 1 });
UserPreferenceSchema.index({ "salaryExpectation.frequency": 1 });
UserPreferenceSchema.index({ updatedAt: -1 });
UserPreferenceSchema.index({ createdAt: -1 });
UserPreferenceSchema.index({ jobRoles: 1 });

export const UserPreference = mongoose.model<IUserPreference>(
  "UserPreference",
  UserPreferenceSchema,
);
