import mongoose, { Schema, Document, Types, model } from "mongoose";
import { getNextYearlyUniqueCode } from "../utils/yearlyUniqueCode";

/** Gender Options */
export type Gender = "male" | "female" | "other";

/** Embedded location */
interface ILocation {
  city?: string[];
  state?: string;
  country?: string;
  pinCode?: string;
}

/** PA Information (Assistant Personal Details - only visible to admin) */
interface IPAInformation {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
}

export interface IPersonalAssistant extends Document {
  paKey?: string;
  name: string;
  email: string;
  gender?: Gender;
  address?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isActive: boolean;
  verified: boolean;
  skills?: string[];
  dateOfBirth?: Date;
  phoneNumber: string;
  location?: ILocation;
  profileImageUrl?: string;
  role: Schema.Types.ObjectId;
  paInformation?: IPAInformation;
}

const PersonalAssistantSchema = new Schema<IPersonalAssistant>(
  {
    paKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    profileImageUrl: String,
    address: String,
    location: {
      city: {
        type: [String],
        default: [],
      },
      state: String,
      country: String,
      pinCode: String,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    dateOfBirth: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    role: {
      ref: "Role",
      required: true,
      type: Schema.Types.ObjectId,
    },
    skills: {
      type: [String],
      default: [],
    },
    paInformation: {
      fullName: String,
      email: String,
      phoneNumber: String,
      address: String,
    },
  },
  { timestamps: true }
);

// Generate paKey before validation
PersonalAssistantSchema.pre("validate", async function (next) {
  try {
    if (!this.isNew) return next();
    
    // Generate paKey if not present
    if (!this.paKey) {
      this.paKey = await getNextYearlyUniqueCode("WSPA", "personalassistant");
      // Set name field to paKey
      this.name = this.paKey;
    }
    
    return next();
  } catch (error) {
    return next(error as any);
  }
});

export const PersonalAssistant = model<IPersonalAssistant>(
  "PersonalAssistant",
  PersonalAssistantSchema
);
