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
  natureOfWork?: string;
  referralCode?: string;
  referredCode?: string;
  pointsEarned?: number;
  agreedToTerms: boolean;
  isMobileVerified: boolean;
  privacyPolicyAccepted: boolean;
  category: Schema.Types.ObjectId;
  preferredJobCategories?: string[];
  referredBy?: Schema.Types.ObjectId;
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
  profile: {
    // Worker
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
      ref: "JobCategory",
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
      required: false,
      lowercase: true,
      type: Schema.Types.String,
      validate: {
        validator: (val: string) => validator.isEmail(val),
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
    privacyPolicyAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
    preferences: {
      jobAlerts: { type: Boolean, default: true },
      notifications: {
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        frequency: {
          type: String,
          enum: ["immediate", "daily", "weekly"],
          default: "daily",
        },
      },
      preferredLanguage: { type: String, default: "en" },
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
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const generateReferralCode = (userId: string) => {
  const prefix = "REF";
  const randomPart = crypto.randomBytes(2).toString("hex");
  const userPart = userId.toString().slice(-4);
  return `${prefix}-${randomPart}-${userPart}`.toUpperCase();
};

// Indexes
userSchema.index({ mobile: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ userType: 1, status: 1 });

export const User = mongoose.model<IUser>("User", userSchema);
