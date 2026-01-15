import crypto from "crypto";
import validator from "validator";
import mongoose, { Schema, Document } from "mongoose";

export enum UserType {
  WORKER = "worker",
  EMPLOYER = "employer",
  CONTRACTOR = "contractor",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING_VERIFICATION = "pending_verification",
}

interface ILocation {
  city: string;
  state: string;
  country: string;
  pincode: string;
  address: string;
}

export interface IUser extends Document {
  mobile: string;
  email?: string;
  fullName: string;
  fcmToken?: string;
  dateOfBirth?: Date;
  userType: UserType;
  status: UserStatus;
  referralCode?: string;
  referredCode?: string;
  pointsEarned?: number;
  agreedToTerms: boolean;
  isMobileVerified: boolean;
  privacyPolicyAccepted: boolean;
  category: Schema.Types.ObjectId;
  preferredJobCategories?: string[];
  referredBy?: Schema.Types.ObjectId;
  trade?: Schema.Types.ObjectId;
  industry?: Schema.Types.ObjectId;
  natureOfWork?: Schema.Types.ObjectId;
  preferences: {
    jobAlerts: boolean;
    notifications: {
      sms: boolean;
      push: boolean;
      email: boolean;
      frequency: "immediate" | "daily" | "weekly";
    };
    preferredLanguage: string;
  };
  primaryLocation?: ILocation;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  userAadhar?: string;
  userPan?: string;
  profile: {
    // Worker
    designation?: string;
    shortDescription?: string;
    skills?: Array<{
      name: string;
      yearsOfExperience: number;
      level: "beginner" | "intermediate" | "advanced" | "expert";
    }>;
    education?: Array<{
      year: number;
      field: string;
      degree: string;
      institution: string;
    }>;
    experience?: Array<{
      endDate?: Date;
      company: string;
      startDate: Date;
      position: string;
      isCurrent: boolean;
    }>;
    availability?: {
      status: "available" | "busy" | "not_available";
      preferredWorkType: "remote" | "onsite" | "hybrid";
    };
    employmentPreferences?: {
      jobRole: string;
      preferredLocations: Array<{
        city: string;
        state?: string;
      }>;
      expectedSalaryRange: {
        min: number;
        max: number;
        currency: string;
      };
      jobScheduleType: "shift" | "regular";
      jobPaymentType: "daily-wage" | "contract";
      jobType: "full-time" | "contractual" | "part-time" | "freelance";
    };

    // Employer
    company?: {
      name: string;
      industry: string;
      gstNumber: string;
      designation: string;
      description: string;
      hiringNeeds: string[];
      totalEmployees: number;
      locations: ILocation[];
    };

    // Contractor
    business?: {
      name: string;
      type: string;
      description: string;
      hiringCapability: number;
      hiringFrequency: string[];
      yearsOfExperience: number;
      gstHolderCompany: boolean;
      operationalArea: ILocation[];
      numberOfCompaniesWorkingWith: number;
      servicesOffered: Array<{
        service: string;
        pricing: {
          amount: number;
          currency: string;
          type: "fixed" | "hourly" | "project";
        };
      }>;
      teamSize: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  hasPremiumPlan?: boolean;
  relocate?: boolean;
  profileCompletion?: number;
  isEmailVerified?: boolean;
  fastResponder?: number; // 0-100 scale: 0 = bad, 100 = good
  hasEarlyAccessBadge?: boolean; // Early Access badge - full premium access
}

// --- Custom Mobile Validator ---
const validateMobile = (mobile: string): boolean => {
  return /^[6-9]\d{9}$/.test(mobile); // Indian mobile number
};

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: validateMobile,
        message: "Invalid Indian mobile number",
      },
    },
    natureOfWork: {
      type: Schema.Types.ObjectId,
      ref: "NatureOfWork",
    },
    industry: {
      type: Schema.Types.ObjectId,
      ref: "Industry",
    },
    trade: {
      type: Schema.Types.ObjectId,
      ref: "Trade",
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "JobCategory",
    },
    preferredJobCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobCategory",
      },
    ],
    fcmToken: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allows multiple users to have no FCM token
      validate: {
        validator: (val: string) => {
          return !val || validator.isLength(val, { min: 10, max: 400 });
        },
        message: "FCM token must be between 10 and 400 characters",
      },
    },
    email: {
      unique: true,
      sparse: true,
      lowercase: true,
      type: Schema.Types.String,
      required: function (this: IUser) {
        return (
          this.userType === UserType.EMPLOYER ||
          this.userType === UserType.CONTRACTOR
        );
      },
      validate: {
        validator: (val: string) => !val || validator.isEmail(val),
        message: "Invalid email address",
      },
    } as const,
    dateOfBirth: {
      type: Date,
      validate: {
        validator: (date: Date) => date < new Date(),
        message: "Date of birth must be in the past",
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },
    userType: {
      type: String,
      required: true,
      enum: Object.values(UserType),
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING_VERIFICATION,
    },
    agreedToTerms: {
      type: Boolean,
      required: true,
      default: false,
    },
    isMobileVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    hasPremiumPlan: {
      type: Boolean,
      default: false,
      required: true,
    },
    relocate: {
      type: Boolean,
      default: false,
    },
    privacyPolicyAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
    preferences: {
      type: {
        jobAlerts: { type: Boolean, default: true },
        notifications: {
          type: {
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true },
            email: { type: Boolean, default: false },
            frequency: {
              type: String,
              enum: ["immediate", "daily", "weekly"],
              default: "daily",
            },
          },
          default: {
            sms: false,
            push: true,
            email: false,
            frequency: "daily",
          },
        },
        preferredLanguage: { type: String, default: "en" },
      },
      default: {
        jobAlerts: true,
        notifications: {
          sms: false,
          push: true,
          email: false,
          frequency: "daily",
        },
        preferredLanguage: "en",
      },
    },
    primaryLocation: {
      city: String,
      state: String,
      pincode: String,
      address: String,
      country: { type: String, default: "India" },
    },
    profile: {
      type: Schema.Types.Mixed,
      default: {},
    },
    pointsEarned: { type: Number, default: 0 },
    referralCode: { type: String, unique: true },
    referredCode: { type: String, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    userAadhar: {
      type: String,
      required: false,
    },
    userPan: {
      type: String,
      required: false,
    },
    profileCompletion: {
      type: Number,
      default: 0, // starts at 0%
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      required: function (this: IUser) {
        return (
          this.userType === UserType.EMPLOYER ||
          this.userType === UserType.CONTRACTOR
        );
      },
    },
    fastResponder: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      description: "Fast responder score: 0-100 (0=bad, 100=good)",
    },
    hasEarlyAccessBadge: {
      type: Boolean,
      default: false,
      description: "Early Access badge - user can access all premium features",
    },
  },
  { timestamps: true }
);

// Check if user has an active premium plan
// This helper verifies the actual enrollment status instead of relying on the hasPremiumPlan boolean
export const checkUserHasActivePremiumPlan = async (userId: string): Promise<boolean> => {
  try {
    // Import here to avoid circular dependency
    const { EnrolledPlan, PlanEnrollmentStatus } = require('./enrollplan.model');
    const { PlanType } = require('./subscriptionplan.model');

    const activeEnrollment = await EnrolledPlan.findOne({
      user: userId,
      status: PlanEnrollmentStatus.ACTIVE,
    }).populate('plan', 'planType');

    if (!activeEnrollment) return false;
    
    const plan = activeEnrollment.plan as any;
    return plan && plan.planType !== PlanType.FREE;
  } catch (error) {
    console.error('Error checking premium plan status:', error);
    return false;
  }
};

// Utility to check if a value is filled
const isFilled = (value: any): boolean => {
  if (value === null || value === undefined) return false;

  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;

  return false;
};

// Function to calculate profile completion
export const calculateProfileCompletion = (user: any): number => {
  let totalPoints = 0;
  let earnedPoints = 0;

  const fields: Array<{ path: string; weight?: number }> = [
    { path: "fullName", weight: 2 },
    { path: "mobile", weight: 2 },
    { path: "email", weight: 1 },
    { path: "dateOfBirth", weight: 1 },
    { path: "gender", weight: 1 },
    { path: "userAadhar", weight: 1 },
    { path: "userPan", weight: 1 },
    { path: "primaryLocation.city", weight: 1 },
    { path: "primaryLocation.state", weight: 1 },
    { path: "primaryLocation.country", weight: 1 },
    { path: "primaryLocation.pincode", weight: 1 },
    { path: "profile.designation", weight: 2 },
    { path: "profile.shortDescription", weight: 2 },
    { path: "profile.skills", weight: 3 },
    { path: "profile.education", weight: 2 },
    { path: "profile.experience", weight: 3 },
    { path: "profile.availability", weight: 2 },
    { path: "profile.employmentPreferences", weight: 2 },
    { path: "profile.company", weight: 3 },
    { path: "profile.business", weight: 3 },
  ];

  fields.forEach(({ path, weight = 1 }) => {
    totalPoints += weight;
    const value = path.split(".").reduce((obj: any, key) => obj?.[key], user);

    if (Array.isArray(value)) {
      if (value.length > 0) earnedPoints += weight;
    } else if (isFilled(value)) {
      earnedPoints += weight;
    }
  });

  return Math.round((earnedPoints / totalPoints) * 100);
};


export const generateReferralCode = (userId: string) => {
  const prefix = "REF";
  const randomPart = crypto.randomBytes(2).toString("hex");
  const userPart = userId.toString().slice(-4);
  return `${prefix}-${randomPart}-${userPart}`.toUpperCase();
};

// Calculate Fast Responder Score (0-100)
// Components:
// - Profile Completion: 0-30 points
// - Job Application Speed: 0-40 points  
// - Job Application Rate (last 30 days): 0-30 points
export const calculateFastResponderScore = (profileCompletionPoints: number, applicationSpeedPoints: number, applicationRatePoints: number): number => {
  // Ensure all components are within their max range
  const profilePoints = Math.min(Math.max(profileCompletionPoints, 0), 30);
  const speedPoints = Math.min(Math.max(applicationSpeedPoints, 0), 40);
  const ratePoints = Math.min(Math.max(applicationRatePoints, 0), 30);
  
  const totalScore = profilePoints + speedPoints + ratePoints;
  return Math.min(totalScore, 100); // Cap at 100
};

// Calculate Profile Completion Points (0-30)
export const calculateProfileCompletionPoints = (user: any): number => {
  let points = 30; // Start with full points
  
  const requiredFields = [
    { field: "fullName", weight: 2 },
    { field: "email", weight: 2 },
    { field: "mobile", weight: 2 },
    { field: "dateOfBirth", weight: 2 },
    { field: "gender", weight: 1 },
    { field: "userAadhar", weight: 3 },
    { field: "userPan", weight: 3 },
    { field: "primaryLocation.city", weight: 1 },
    { field: "primaryLocation.state", weight: 1 },
    { field: "primaryLocation.address", weight: 1 },
    { field: "profile.skills", weight: 2 },
    { field: "profile.education", weight: 2 },
    { field: "profile.experience", weight: 2 },
    { field: "industry", weight: 2 },
  ];

  let totalWeight = 0;
  let filledWeight = 0;

  requiredFields.forEach(({ field, weight }) => {
    totalWeight += weight;
    const value = field.split(".").reduce((obj: any, key) => obj?.[key], user);
    
    if (isFilled(value)) {
      filledWeight += weight;
    }
  });

  if (totalWeight === 0) return 0;
  return Math.round((filledWeight / totalWeight) * 30);
};

// Calculate Application Speed Points (0-40) based on time between job creation and application
export const calculateApplicationSpeedPoints = (hoursDifference: number): number => {
  if (hoursDifference <= 3) return 30;
  if (hoursDifference <= 12) return 25;
  if (hoursDifference <= 24) return 20;
  if (hoursDifference <= 72) return 15;
  if (hoursDifference <= 120) return 10;
  if (hoursDifference <= 168) return 5;
  return 0;
};

// Calculate Application Rate Points (0-30) based on percentage of preferred jobs applied to
export const calculateApplicationRatePoints = (applicationPercentage: number): number => {
  if (applicationPercentage >= 100) return 30;
  if (applicationPercentage >= 80) return 24;
  if (applicationPercentage >= 60) return 18;
  if (applicationPercentage >= 40) return 12;
  if (applicationPercentage >= 20) return 6;
  return 0;
};

// Indexes
// Rely on schema `unique` flags for mobile/email/referralCode indexes.
userSchema.index({ userType: 1, status: 1 });
userSchema.index({ fullName: "text" }); // for text search on name
userSchema.index({ createdAt: -1 }); // for sorting latest users

// Compound indexes
userSchema.index({ category: 1, status: 1 }); // useful when filtering by category + status
userSchema.index({ preferredJobCategories: 1 }); // for job preference filters
userSchema.index({ referredBy: 1 }); // for analytics/referral queries

// Optional: for high volume geolocation-based features
userSchema.index({
  "primaryLocation.city": 1,
  "primaryLocation.state": 1,
});

export const User = mongoose.model<IUser>("User", userSchema);
