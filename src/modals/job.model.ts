import mongoose, { Schema, Document, Types } from "mongoose";

// ADVANCED ENUMS
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

export interface IJobHistory {
  comment: string;
  timestamp: Date;
  commentedBy: Types.ObjectId;
}

export enum JobStatus {
  OPEN = "open",
  DRAFT = "draft",
  PAUSED = "paused",
  FILLED = "filled",
  CLOSED = "closed",
  EXPIRED = "expired",
  REJECTED = "rejected",
  PENDING_APPROVAL = "pending-approval",
}

export enum Priority {
  LOW = "low",
  HIGH = "high",
  NORMAL = "normal",
  URGENT = "urgent",
}

export enum Industry {
  MEDIA = "media",
  OTHER = "other",
  RETAIL = "retail",
  ENERGY = "energy",
  FINANCE = "finance",
  EDUCATION = "education",
  TECHNOLOGY = "technology",
  HEALTHCARE = "healthcare",
  CONSULTING = "consulting",
  NON_PROFIT = "non-profit",
  GOVERNMENT = "government",
  AGRICULTURE = "agriculture",
  REAL_ESTATE = "real-estate",
  MANUFACTURING = "manufacturing",
  TRANSPORTATION = "transportation",
}

export enum Currency {
  INR = "INR",
}

export enum SalaryPeriod {
  DAILY = "daily",
  HOURLY = "hourly",
  YEARLY = "yearly",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  PROJECT_BASED = "project-based",
}

// ADVANCED INTERFACES
export interface ISkillRequirement {
  name: string;
  required: boolean;
  yearsOfExperience?: number;
  level: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface IBenefit {
  type:
  | "pto"
  | "gym"
  | "bonus"
  | "other"
  | "health"
  | "dental"
  | "equity"
  | "vision"
  | "flexible"
  | "learning"
  | "transport"
  | "retirement";
}

export interface IWorkSchedule {
  endTime?: string;
  timezone?: string;
  startTime?: string;
  hoursPerWeek?: number;
  workingDays: string[];
  flexibleHours?: boolean;
  shiftsAvailable?: string[];
}

export interface IApplicationProcess {
  steps: Array<{
    step: number;
    type:
    | "screening"
    | "application"
    | "technical_test"
    | "phone_interview"
    | "video_interview"
    | "reference_check"
    | "onsite_interview"
    | "background_check"
    | "offer";
    description: string;
    estimatedDuration?: string;
  }>;
  expectedTimeToHire?: number; // days
  contactPerson?: {
    name: string;
    role: string;
    email: string;
    phone?: string;
  };
}

const JobHistorySchema = new Schema<IJobHistory>(
  {
    comment: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    commentedBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
  },
  { _id: false }
);

export interface IJob extends Document {
  // Basic Information
  title: string;
  category: any;
  userType: string;
  teamSize?: number;
  description: string;
  shortDescription?: string;

  // Location & Work Arrangement
  location: {
    city?: string;
    state?: string;
    country: string;
    address?: string;
    postalCode?: string;
    isRemoteFriendly?: boolean;
    allowsRelocation?: boolean;
  };

  history: IJobHistory[];

  // Compensation & Benefits
  salary: {
    min: number;
    max: number;
    currency: Currency;
    period: SalaryPeriod;
    isNegotiable: boolean;
    includesBonus?: boolean;
    bonusStructure?: string;
  };
  benefits?: IBenefit[];
  attributes: any;

  // Job Details
  jobType: JobType;
  workMode: WorkMode;
  industry: Industry;
  workSchedule: IWorkSchedule;
  experienceLevel: ExperienceLevel;

  // Skills & Requirements
  skillsRequired?: ISkillRequirement[];
  qualifications: {
    education?: Array<{
      level:
      | "high_school"
      | "associates"
      | "bachelors"
      | "masters"
      | "phd"
      | "professional";
      field?: string;
      required: boolean;
    }>;
    languages?: Array<{
      language: string;
      level: "basic" | "conversational" | "fluent" | "native";
      required: boolean;
    }>;
    experience: {
      minYears: number;
      maxYears?: number;
      preferredIndustries?: string[];
      specificExperience?: string[];
    };
  };

  // Job Management
  tags: string[];
  status: JobStatus;
  priority: Priority;
  categories: string[];
  postedBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;

  // Application Management
  applicationProcess: IApplicationProcess;
  applicationDeadline?: Date;
  maxApplications?: number;

  // Dates & Expiry
  expiresAt?: Date;
  imageUrl?: string;
  publishedAt?: Date;
  lastBoostedAt?: Date;
  autoRepost?: {
    enabled: boolean;
    interval: number; // days
    maxReposts: number;
  };

  // Analytics & Performance
  metrics: any;
  createdAt: Date;
  updatedAt: Date;
}

// MONGOOSE SCHEMA
const JobSchema = new Schema<IJob>(
  {
    // Basic Information
    title: {
      trim: true,
      index: true,
      type: String,
      maxlength: 200,
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    shortDescription: {
      type: String,
      maxlength: 500,
    },
    teamSize: Number,

    // Location & Work Arrangement
    location: {
      city: String,
      state: String,
      address: String,
      country: String,
      postalCode: String,
      isRemoteFriendly: { type: Boolean, default: false },
      allowsRelocation: { type: Boolean, default: false },
    },

    // Compensation & Benefits
    salary: {
      min: { type: Number, min: 0, default: 0 },
      max: { type: Number, min: 0, default: 0 },
      currency: {
        type: String,
        default: Currency.INR,
        enum: Object.values(Currency),
      },
      period: {
        type: String,
        default: SalaryPeriod.YEARLY,
        enum: Object.values(SalaryPeriod),
      },
      includesBonus: Boolean,
      bonusStructure: String,
      isNegotiable: { type: Boolean, default: false },
    },
    benefits: [
      {
        type: {
          type: String,
          enum: [
            "health",
            "dental",
            "vision",
            "retirement",
            "pto",
            "flexible",
            "bonus",
            "equity",
            "learning",
            "gym",
            "transport",
            "other",
          ],
        },
      },
    ],

    // Job Details
    jobType: {
      type: String,
      index: true,
      default: JobType.FULL_TIME,
      enum: Object.values(JobType),
    },
    // Job Details
    userType: {
      type: String,
      index: true,
      required: true,
      default: "worker",
      enum: ["worker", "contractor"],
    },
    workMode: {
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
    industry: {
      index: true,
      type: String,
      enum: Object.values(Industry),
    },
    history: [JobHistorySchema],
    workSchedule: {
      endTime: String,
      timezone: String,
      startTime: String,
      hoursPerWeek: Number,
      workingDays: [String],
      flexibleHours: Boolean,
      shiftsAvailable: [String],
    },

    // Skills & Requirements
    skillsRequired: [
      {
        name: { type: String, required: false }, // optional
        level: {
          type: String,
          enum: ["beginner", "intermediate", "advanced", "expert"],
          default: "intermediate",
          required: false, // optional
        },
        yearsOfExperience: { type: Number, required: false }, // optional
        required: { type: Boolean, default: false, required: false }, // optional
      },
    ],
    qualifications: {
      education: [
        {
          level: {
            type: String,
            enum: [
              "phd",
              "masters",
              "bachelors",
              "associates",
              "high_school",
              "professional",
            ],
          },
          field: String,
          required: Boolean,
        },
      ],
      languages: [
        {
          language: String,
          level: {
            type: String,
            enum: ["basic", "conversational", "fluent", "native"],
          },
          required: Boolean,
        },
      ],
      attributes: {
        type: Schema.Types.Mixed,
        default: {},
      },
      experience: {
        maxYears: Number,
        specificExperience: [String],
        preferredIndustries: [String],
        minYears: { type: Number, default: 0 },
      },
    },

    // Job Management
    status: {
      index: true,
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.PENDING_APPROVAL,
    },
    imageUrl: { type: String },
    priority: {
      index: true,
      type: String,
      default: Priority.NORMAL,
      enum: Object.values(Priority),
    },
    tags: [{ type: String, index: true }],
    category: { type: Schema.Types.ObjectId, ref: "JobCategory" },
    postedBy: {
      ref: "User",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },

    // Application Management
    applicationProcess: {
      steps: [
        {
          step: Number,
          type: {
            type: String,
            enum: [
              "offer",
              "screening",
              "application",
              "technical_test",
              "phone_interview",
              "video_interview",
              "reference_check",
              "onsite_interview",
              "background_check",
            ],
          },
          description: String,
          estimatedDuration: String,
        },
      ],
      expectedTimeToHire: Number,
      contactPerson: {
        name: String,
        role: String,
        email: String,
        phone: String,
      },
    },
    maxApplications: Number,
    applicationDeadline: Date,

    // Dates & Expiry
    lastBoostedAt: { type: Date, default: new Date() },
    expiresAt: { type: Date, index: true, default: new Date() },
    publishedAt: { type: Date, index: true, default: new Date() },
    autoRepost: {
      interval: Number,
      maxReposts: Number,
      enabled: { type: Boolean, default: false },
    },
    metrics: {
      hired: { type: Number, default: 0 },
      applied: { type: Number, default: 0 },
      offered: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
      interview: { type: Number, default: 0 },
      withdrawn: { type: Number, default: 0 },
      shortlisted: { type: Number, default: 0 },
      under_review: { type: Number, default: 0 },
      offer_declined: { type: Number, default: 0 },
      offer_accepted: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// 🔍 Full-text Search Index
JobSchema.index(
  {
    title: "text",
    description: "text",
    "skillsRequired.name": "text",
    tags: "text",
  },
  {
    weights: {
      title: 10,
      "skillsRequired.name": 5,
      tags: 3,
      description: 1,
    },
    name: "FullTextJobSearchIndex",
  }
);

// 📌 Compound Indexes for Filters and Listings
JobSchema.index({
  status: 1,
  jobType: 1,
  workMode: 1,
  experienceLevel: 1,
  industry: 1,
  publishedAt: -1,
}, { name: "JobListingQueryIndex" });

JobSchema.index({
  "location.country": 1,
  "location.city": 1,
  jobType: 1,
  experienceLevel: 1,
}, { name: "LocationJobFilterIndex" });

JobSchema.index({
  postedBy: 1,
  status: 1,
}, { name: "PostedByStatusIndex" });

// ⏳ TTL Index for Auto-Expired Jobs
JobSchema.index(
  {
    expiresAt: 1,
    status: 1,
  },
  {
    name: "AutoExpireJobsIndex",
    expireAfterSeconds: 0,
    partialFilterExpression: {
      expiresAt: { $exists: true },
      status: { $in: [JobStatus.OPEN, JobStatus.EXPIRED] },
    },
  }
);

// 🌐 SEO-friendly Slug Index
JobSchema.index({ "seo.slug": 1 }, { unique: true, sparse: true, name: "SeoSlugUniqueIndex" });

// 🚀 Active Job Prioritization Index
JobSchema.index(
  {
    status: 1,
    publishedAt: -1,
    priority: -1,
  },
  {
    name: "ActiveJobsPriorityIndex",
    partialFilterExpression: {
      status: { $in: [JobStatus.OPEN, JobStatus.PAUSED] },
      deletedAt: { $exists: false },
    },
  }
);

// VIRTUAL FIELDS
JobSchema.virtual("isExpired").get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

JobSchema.virtual("daysUntilExpiry").get(function () {
  if (!this.expiresAt) return null;
  const days = Math.ceil(
    (this.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, days);
});

// MIDDLEWARE
JobSchema.pre("save", function (next) {
  if (this.salary.max < this.salary.min)
    return next(new Error("Maximum salary must be >= minimum salary"));

  if (
    this.isModified("status") &&
    this.status === JobStatus.OPEN &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  if (!this.expiresAt && this.status === JobStatus.OPEN)
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  next();
});

// Static methods for common queries
JobSchema.statics.findActive = function () {
  return this.find({
    status: JobStatus.OPEN,
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: { $exists: false } },
    ],
    deletedAt: { $exists: false },
  });
};

JobSchema.statics.findByLocation = function (country: string, city?: string) {
  const query: any = {
    "location.country": country,
    status: JobStatus.OPEN,
    deletedAt: { $exists: false },
  };
  if (city) query["location.city"] = new RegExp(city, "i");
  return this.find(query);
};

JobSchema.statics.findSimilar = function (jobId: string, limit = 5) {
  return this.aggregate([
    { $match: { _id: { $ne: jobId }, status: JobStatus.OPEN } },
    { $sample: { size: limit } },
  ]);
};

JobSchema.methods.markAsExpired = function () {
  this.status = JobStatus.EXPIRED;
  return this.save();
};

export const Job = mongoose.model<IJob>("Job", JobSchema);
