import mongoose, { Schema, Document } from "mongoose";

export enum UserType {
  WORKER = "worker",
  EMPLOYER = "employer",
  CONTRACTOR = "contractor",
}

export enum PlanType {
  FREE = "free",
  BASIC = "basic",
  PREMIUM = "premium",
  GROWTH = "growth",
  ENTERPRISE = "enterprise",
  PROFESSIONAL = "professional",
}

export enum BillingCycle {
  MONTHLY = "monthly",
  ANNUALLY = "annually",
  LIFETIME = "lifetime",
  QUARTERLY = "quarterly",
  SEMI_ANNUALLY = "semi_annually",
  PAY_AS_YOU_GO = "pay_as_you_go",
}

const LimitSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    limit: { type: Number, default: null }, // null = unlimited
    unlimited: { type: Boolean, default: false },
  },
  { _id: false }
);

const ModeSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    mode: {
      type: String,
      enum: ["blurred", "standard", "highlighted", "featured", "priority", "full"],
    },
  },
  { _id: false }
);

const ServiceOnlySchema = new Schema(
  {
    visible: { type: Boolean, default: true },
    access: {
      type: String,
      enum: ["view_only", "service_request"],
      default: "view_only",
    },
  },
  { _id: false }
);

// 🔍 SEARCH & CONTACT FEATURE SCHEMA
// Includes both search employer jobs and candidate/contact management
const SearchAndContactSchema = new Schema(
  {
    // ===== SEARCH EMPLOYER JOBS =====
    // Mode: blurred (limited view), standard (full view), highlighted, featured, priority
    searchEmployerJobs: ModeSchema,
    // Monthly limit on viewing employer job listings (0 = disabled, null = unlimited)
    employerJobViewsPerMonth: LimitSchema,
    // Number of employer jobs that can be saved
    saveEmployerJobs: LimitSchema,
    // Monthly applications to employer jobs
    applyToEmployerJobs: LimitSchema,
    // Priority in application queue
    priorityApply: {
      type: Boolean,
      default: false,
    },
    // How application is displayed to employers
    applyVisibility: ModeSchema,

    // ===== AGENCY CONTACTS - EMPLOYER & CANDIDATE =====
    // Can view employer contact information
    viewEmployerContact: LimitSchema,
    // Can call or WhatsApp employers
    callOrWhatsappEmployer: LimitSchema,
    // Can search the candidate database
    searchCandidates: ModeSchema,
    // Monthly views of candidate profiles
    candidateProfileViews: LimitSchema,
    // Number of candidates that can be saved
    saveCandidates: LimitSchema,
    // Monthly unlocks of candidate contact information
    candidateContactUnlocks: LimitSchema,
  },
  { _id: false }
);

// 💼 JOB POSTING FOR CANDIDATES FEATURE SCHEMA
// Allows posting jobs to candidate pool
const JobPostingSchema = new Schema(
  {
    // Monthly limit for posting new jobs
    postJob: LimitSchema,
    // How job is displayed - standard or priority
    jobVisibility: ModeSchema,
    // Free monthly job boosts/promotions
    freeJobBoosts: LimitSchema,
    // Whether paid job boost option is available
    paidJobBoostOption: {
      type: Boolean,
      default: false,
    },
    // Number of job drafts that can be saved
    saveJobDrafts: LimitSchema,
    // Whether to receive job applications
    receiveApplications: {
      type: Boolean,
      default: false,
    },
    // Application filtering capabilities
    filterApplications: {
      enabled: { type: Boolean, default: false },
      level: {
        type: String,
        enum: ["basic", "advanced"],
      },
    },
    // Monthly limit to invite candidates to apply
    inviteCandidates: LimitSchema,
    // Monthly unlocks of candidate contact information
    candidateContactUnlocks: LimitSchema,
  },
  { _id: false }
);

// 🏢 JOB POSTING FOR AGENCIES (B2B) FEATURE SCHEMA
// Allows posting jobs between agencies
const JobPostingAgenciesSchema = new Schema(
  {
    // Monthly limit for posting jobs to other agencies
    postJob: LimitSchema,
    // How job is displayed to other agencies
    jobVisibility: ModeSchema,
    // Free monthly job boosts for agency listings
    freeJobBoosts: LimitSchema,
    // Whether paid job boost option is available for agencies
    paidJobBoostOption: {
      type: Boolean,
      default: false,
    },
    // Number of agency job drafts that can be saved
    saveJobDrafts: LimitSchema,
    // Whether to receive agency applications
    receiveApplications: {
      type: Boolean,
      default: false,
    },
    // Agency application filtering capabilities
    filterApplications: {
      enabled: { type: Boolean, default: false },
      level: {
        type: String,
        enum: ["basic", "advanced"],
      },
    },
    // Monthly limit to invite other agencies
    inviteAgencies: LimitSchema,
    // Monthly unlocks of agency contact information
    agencyContactUnlocks: LimitSchema,
  },
  { _id: false }
);

// 🧠 SMART HIRING FEATURE SCHEMA
// Premium features for advanced hiring
const SmartHiringSchema = new Schema(
  {
    // Access to pre-interviewed candidates
    preInterviewedCandidates: LimitSchema,
    // Pre-screened employer list (B2B)
    preScreenedEmployers: {
      enabled: { type: Boolean, default: false },
      unlockType: {
        type: String,
        enum: ["paid", "included"],
      },
    },
    // Level of support provided
    supportLevel: {
      type: String,
      enum: ["none", "priority_chat", "sla_review_call"],
      default: "none",
    },
  },
  { _id: false }
);

// 📅 COMPLIANCE & COMMUNITY FEATURE SCHEMA
// Compliance calendar and community engagement features
const ComplianceAndCommunitySchema = new Schema(
  {
    // Compliance calendar access level
    complianceCalendar: {
      enabled: { type: Boolean, default: false },
      level: {
        type: String,
        enum: ["view", "checklist", "alerts", "pro"],
      },
    },
    // Can view community posts and discussions
    communityView: {
      type: Boolean,
      default: false,
    },
    // Can post in community
    communityPost: {
      type: Boolean,
      default: false,
    },
    // Can connect/follow other community members
    communityConnect: {
      type: Boolean,
      default: false,
    },
    // Can endorse skills/members
    endorsements: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const ServiceOnlyFeaturesSchema = new Schema(
  {
    bulkHiring: ServiceOnlySchema,
    projectBasedHiring: ServiceOnlySchema,
    onDemandWorkerAllocation: ServiceOnlySchema,
  },
  { _id: false }
);

const PremiumServicesDiscountsSchema = new Schema(
  {
    brandingSupport: { type: Number, default: 0 },
    virtualHR: { type: Number, default: 0 },
    virtualRecruiter: { type: Number, default: 0 },
    exclusiveProjects: { type: Number, default: 0 },
    prioritySupport: { type: Boolean, default: false },
  },
  { _id: false }
);

const ContractorFeaturesSchema = new Schema(
  {
    searchAndContact: SearchAndContactSchema,
    jobPostingCandidates: JobPostingSchema,
    jobPostingAgencies: JobPostingAgenciesSchema,
    smartHiring: SmartHiringSchema,
    complianceAndCommunity: ComplianceAndCommunitySchema,
    serviceOnlyFeatures: ServiceOnlyFeaturesSchema,
    premiumServicesDiscounts: PremiumServicesDiscountsSchema,
  },
  { _id: false }
);

export const calculateExpiryDate = (
  startDate: Date,
  cycle: BillingCycle
): Date => {
  const date = new Date(startDate);
  switch (cycle) {
    case BillingCycle.MONTHLY:
      date.setMonth(date.getMonth() + 1);
      break;
    case BillingCycle.QUARTERLY:
      date.setMonth(date.getMonth() + 3);
      break;
    case BillingCycle.SEMI_ANNUALLY:
      date.setMonth(date.getMonth() + 6);
      break;
    case BillingCycle.ANNUALLY:
      date.setFullYear(date.getFullYear() + 1);
      break;
    case BillingCycle.LIFETIME:
      date.setFullYear(date.getFullYear() + 100);
      break;
    case BillingCycle.PAY_AS_YOU_GO:
      date.setDate(date.getDate() + 1); // or undefined if no expiry
      break;
    default:
      throw new Error("Invalid billing cycle");
  }
  return date;
};

export enum Currency {
  INR = "INR",
}

export enum PlanStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

interface ILimit {
  enabled: boolean;
  limit: number | null;
  unlimited: boolean;
}

interface IMode {
  enabled: boolean;
  mode?: "blurred" | "standard" | "highlighted" | "featured" | "priority";
}

interface IServiceOnly {
  visible: boolean;
  access: "view_only" | "service_request";
}

interface IFilterApplications {
  enabled: boolean;
  level?: "basic" | "advanced";
}

interface ISearchAndContact {
  searchEmployerJobs: IMode;
  employerJobViewsPerMonth: ILimit;
  saveEmployerJobs: ILimit;
  applyToEmployerJobs: ILimit;
  priorityApply: boolean;
  applyVisibility: IMode;
  viewEmployerContact: ILimit;
  callOrWhatsappEmployer: ILimit;
  searchCandidates: IMode;
  candidateProfileViews: ILimit;
  saveCandidates: ILimit;
  candidateContactUnlocks: ILimit;
}

interface IJobPosting {
  postJob: ILimit;
  jobVisibility: IMode;
  freeJobBoosts: ILimit;
  paidJobBoostOption: boolean;
  saveJobDrafts: ILimit;
  receiveApplications: boolean;
  filterApplications: IFilterApplications;
  inviteCandidates: ILimit;
  candidateContactUnlocks: ILimit;
}

interface IJobPostingAgencies {
  postJob: ILimit;
  jobVisibility: IMode;
  freeJobBoosts: ILimit;
  paidJobBoostOption: boolean;
  saveJobDrafts: ILimit;
  receiveApplications: boolean;
  filterApplications: IFilterApplications;
  inviteAgencies: ILimit;
  agencyContactUnlocks: ILimit;
}

interface IPreScreenedEmployers {
  enabled: boolean;
  unlockType?: "paid" | "included";
}

interface ISmartHiring {
  preInterviewedCandidates: ILimit;
  preScreenedEmployers: IPreScreenedEmployers;
  supportLevel: "none" | "priority_chat" | "sla_review_call";
}

interface IComplianceCalendar {
  enabled: boolean;
  level?: "view" | "checklist" | "alerts" | "pro";
}

interface IComplianceAndCommunity {
  complianceCalendar: IComplianceCalendar;
  communityView: boolean;
  communityPost: boolean;
  communityConnect: boolean;
  endorsements: boolean;
}

interface IServiceOnlyFeatures {
  bulkHiring: IServiceOnly;
  projectBasedHiring: IServiceOnly;
  onDemandWorkerAllocation: IServiceOnly;
}

interface IPremiumServicesDiscounts {
  brandingSupport: number;
  virtualHR: number;
  virtualRecruiter: number;
  exclusiveProjects: number;
  prioritySupport: boolean;
}

interface IContractorFeatures {
  searchAndContact: ISearchAndContact;
  jobPostingCandidates: IJobPosting;
  jobPostingAgencies: IJobPostingAgencies;
  smartHiring: ISmartHiring;
  complianceAndCommunity: IComplianceAndCommunity;
  serviceOnlyFeatures: IServiceOnlyFeatures;
  premiumServicesDiscounts: IPremiumServicesDiscounts;
}

export interface ISubscriptionPlan extends Document {
  name: string;
  features: any[];
  createdAt: Date;
  updatedAt: Date;
  priority: number;
  tagline?: string;
  basePrice: number;
  currency: Currency;
  planType: PlanType;
  userType: UserType;
  status: PlanStatus;
  isPopular: boolean;
  displayName: string;
  description: string;
  isRecommended: boolean;
  billingCycle: BillingCycle;
  monthlyJobListingLimit?: number;
  contractorFeatures?: IContractorFeatures;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      trim: true,
      index: true,
      unique: true,
      required: true,
      maxlength: 100,
    },
    displayName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    tagline: {
      type: String,
      maxlength: 200,
    },
    planType: {
      type: String,
      required: true,
      enum: Object.values(PlanType),
      index: true,
    },
    userType: {
      type: String,
      required: true,
      enum: Object.values(UserType),
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: Currency.INR,
      enum: Object.values(Currency),
    },
    billingCycle: {
      type: String,
      required: true,
      enum: Object.values(BillingCycle),
    },
    features: [{ type: Schema.Types.ObjectId, ref: "Feature" }],
    monthlyJobListingLimit: {
      type: Number,
      min: 0,
      default: null,
      // Represents the allowed number of job listings per month for employer/contractor plans.
    },
    status: {
      type: String,
      enum: Object.values(PlanStatus),
      default: PlanStatus.INACTIVE,
      index: true,
    },
    isRecommended: {
      type: Boolean,
      default: false,
    },
    isPopular: {
      type: Boolean,
      default: false,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    contractorFeatures: ContractorFeaturesSchema,
  },
  { timestamps: true }
);

// Filter by user type (worker, employer, contractor)
SubscriptionPlanSchema.index({ userType: 1 });

// Sorting/filtering recommended plans
SubscriptionPlanSchema.index({ isRecommended: 1 });

// Compound index for listing plans for a specific user type + status
SubscriptionPlanSchema.index({ userType: 1, status: 1 });

// Optional: for UI rendering/filtering in dashboards
SubscriptionPlanSchema.index({ billingCycle: 1 });

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  "SubscriptionPlan",
  SubscriptionPlanSchema
);
