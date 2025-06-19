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

export interface IJobMetrics {
  views: {
    total: number;
    unique: number;
  };
  applications: {
    total: number;
    hired: number;
    qualified: number;
    interviewed: number;
    conversionRate: number;
  };
  engagement: {
    saves: number;
    shares: number;
  };
}

export interface IJob extends Document {
  // Basic Information
  title: string;
  category: any;
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
  benefits: IBenefit[];

  // Job Details
  jobType: JobType;
  workMode: WorkMode;
  industry: Industry;
  workSchedule: IWorkSchedule;
  experienceLevel: ExperienceLevel;

  // Skills & Requirements
  skillsRequired: ISkillRequirement[];
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
  publishedAt?: Date;
  lastBoostedAt?: Date;
  autoRepost?: {
    enabled: boolean;
    interval: number; // days
    maxReposts: number;
  };

  // Analytics & Performance
  metrics: IJobMetrics;
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
      min: { type: Number, required: true, min: 0 },
      max: { type: Number, required: true, min: 0 },
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
      required: true,
      enum: Object.values(Industry),
    },
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
        name: { type: String, required: true },
        level: {
          type: String,
          default: "intermediate",
          enum: ["beginner", "intermediate", "advanced", "expert"],
        },
        yearsOfExperience: Number,
        required: { type: Boolean, default: true },
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
      default: JobStatus.DRAFT,
      enum: Object.values(JobStatus),
    },
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

    // Analytics & Performance
    metrics: {
      views: {
        total: { type: Number, default: 0 },
        unique: { type: Number, default: 0 },
      },
      applications: {
        total: { type: Number, default: 0 },
        hired: { type: Number, default: 0 },
        qualified: { type: Number, default: 0 },
        interviewed: { type: Number, default: 0 },
        conversionRate: { type: Number, default: 0 },
      },
      engagement: {
        saves: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true }
);

// ADVANCED INDEXES FOR OPTIMAL PERFORMANCE
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
  }
);

// Compound indexes for common query patterns
JobSchema.index({
  status: 1,
  jobType: 1,
  workMode: 1,
  experienceLevel: 1,
  industry: 1,
  publishedAt: -1,
});

JobSchema.index({
  "location.country": 1,
  "location.city": 1,
  jobType: 1,
  experienceLevel: 1,
});

JobSchema.index({
  company: 1,
  status: 1,
  createdAt: -1,
});

JobSchema.index({
  postedBy: 1,
  status: 1,
});

JobSchema.index(
  {
    expiresAt: 1,
    status: 1,
  },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      expiresAt: { $exists: true },
      status: { $in: [JobStatus.OPEN, JobStatus.EXPIRED] },
    },
  }
);

JobSchema.index({ "seo.slug": 1 }, { unique: true, sparse: true });

// Partial index for active jobs only
JobSchema.index(
  {
    status: 1,
    publishedAt: -1,
    priority: -1,
  },
  {
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

JobSchema.virtual("applicationConversionRate").get(function () {
  const total = this.metrics?.applications?.total || 0;
  const hired = this.metrics?.applications?.hired || 0;
  return total > 0 ? Math.round((hired / total) * 100) : 0;
});

JobSchema.virtual("viewToApplicationRate").get(function () {
  const views = this.metrics?.views?.total || 0;
  const applications = this.metrics?.applications?.total || 0;
  return views > 0 ? Math.round((applications / views) * 100) : 0;
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

// Instance methods
JobSchema.methods.incrementView = function (
  source?: string,
  location?: string
) {
  this.metrics.views.total += 1;
  this.metrics.views.unique += 1;

  if (source) {
    const currentCount = this.metrics.views.bySource.get(source) || 0;
    this.metrics.views.bySource.set(source, currentCount + 1);
  }

  if (location) {
    const currentCount = this.metrics.views.byLocation.get(location) || 0;
    this.metrics.views.byLocation.set(location, currentCount + 1);
  }

  return this.save();
};

JobSchema.methods.addApplication = function () {
  this.metrics.applications.total += 1;
  return this.save();
};

JobSchema.methods.markAsExpired = function () {
  this.status = JobStatus.EXPIRED;
  return this.save();
};

export const Job = mongoose.model<IJob>("Job", JobSchema);
