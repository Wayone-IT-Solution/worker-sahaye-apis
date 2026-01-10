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
  industryId?: mongoose.Types.ObjectId;
  subIndustryId?: mongoose.Types.ObjectId;
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
    industryId: {
      ref: "Industry",
      type: Schema.Types.ObjectId,
      index: true,
    },
    subIndustryId: {
      ref: "SubIndustry",
      type: Schema.Types.ObjectId,
      index: true,
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

// 🔍 Filter & join optimization
UserPreferenceSchema.index({ jobRole: 1 }); // useful for filtering or joining with JobCategory

// 🏭 Industry-based filtering
UserPreferenceSchema.index({ industryId: 1 }); // useful for filtering by industry
UserPreferenceSchema.index({ subIndustryId: 1 }); // useful for filtering by sub-industry

// 📍 Location-based filtering
UserPreferenceSchema.index({ preferredLocations: 1 }); // useful for searching by preferred cities

// 🧠 Work preference filters
UserPreferenceSchema.index({ jobType: 1 });
UserPreferenceSchema.index({ isWillingToRelocate: 1 });

// 💰 Salary expectation filter
UserPreferenceSchema.index({ "salaryExpectation.frequency": 1 });
UserPreferenceSchema.index({ "salaryExpectation.amount": 1 });

// 📅 For time-based queries (recent updates etc.)
UserPreferenceSchema.index({ updatedAt: -1 });
UserPreferenceSchema.index({ createdAt: -1 });

export const UserPreference = mongoose.model<IUserPreference>(
  "UserPreference",
  UserPreferenceSchema
);
