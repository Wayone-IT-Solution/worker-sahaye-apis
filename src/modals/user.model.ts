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
  fullName: string;
  mobile: string;
  email?: string;
  dateOfBirth?: Date;
  userType: UserType;
  status: UserStatus;
  agreedToTerms: boolean;
  isMobileVerified: boolean;
  privacyPolicyAccepted: boolean;
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

    // Employer
    company?: {
      name: string;
      industry: string;
      description: string;
      hiringNeeds: string[];
      locations: ILocation[];
      totalEmployees: number;
    };

    // Contractor
    business?: {
      name: string;
      type: string;
      description: string;
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
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ mobile: 1 });
userSchema.index({ userType: 1, status: 1 });

const User = mongoose.model<IUser>("User", userSchema);

export default User;
