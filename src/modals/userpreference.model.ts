import mongoose, { Schema, Document } from "mongoose";

export enum JobType {
  CONTRACT = "contract",
  FULL_TIME = "full-time",
  PART_TIME = "part-time",
  FREELANCE = "freelance",
  TEMPORARY = "temporary",
  VOLUNTEER = "volunteer",
  INTERNSHIP = "internship",
  CONSULTING = "consulting",
}

export enum WorkMode {
  REMOTE = "remote",
  HYBRID = "hybrid",
  ON_SITE = "on-site",
  FLEXIBLE = "flexible",
}

export enum SalaryPeriod {
  DAILY = "daily",
  HOURLY = "hourly",
  YEARLY = "yearly",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  PROJECT_BASED = "project-based",
}

export enum ExperienceLevel {
  VP = "vp",
  MID = "mid",
  LEAD = "lead",
  ENTRY = "entry",
  JUNIOR = "junior",
  SENIOR = "senior",
  C_LEVEL = "c-level",
  DIRECTOR = "director",
  PRINCIPAL = "principal",
  EXECUTIVE = "executive",
}

export interface IUserPreference extends Document {
  preferredLocations: string[];
  userId: mongoose.Types.ObjectId;
  jobRole: mongoose.Types.ObjectId;
  salaryExpectation: {
    amount: number;
    frequency: SalaryPeriod;
  };
  updatedAt: Date;
  createdAt: Date;
  jobType: JobType;
  workModes: WorkMode;
  isWillingToRelocate: boolean;
  experienceLevel: ExperienceLevel;
}

const UserPreferenceSchema: Schema = new Schema<IUserPreference>(
  {
    userId: {
      ref: "User",
      unique: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    jobRole: {
      required: true,
      ref: "JobCategory",
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
    jobType: {
      type: String,
      default: JobType.FULL_TIME,
      enum: Object.values(JobType),
    },
    workModes: {
      index: true,
      type: String,
      default: WorkMode.ON_SITE,
      enum: Object.values(WorkMode),
    },
    experienceLevel: {
      index: true,
      type: String,
      default: ExperienceLevel.ENTRY,
      enum: Object.values(ExperienceLevel),
    },
    isWillingToRelocate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserPreference = mongoose.model<IUserPreference>(
  "UserPreference",
  UserPreferenceSchema
);
