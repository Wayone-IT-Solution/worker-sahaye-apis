import mongoose, { Schema, Document, Types } from "mongoose";

export interface IVirtualHR extends Document {
  bio?: string;
  name: string;
  email: string;
  mobile: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  availableDays: string[];
  expertiseAreas: string[];
  experienceInYears: number;
  languagesSpoken: string[];
  preferredIndustries: string[];
  communicationModes: ("Google Meet" | "Phone Call" | "WhatsApp" | "Zoom" | string)[];
}

// --- Custom Mobile Validator ---
const validateMobile = (mobile: string): boolean => {
  return /^[6-9]\d{9}$/.test(mobile); // Indian mobile number
};

const VirtualHRSchema = new Schema<IVirtualHR>(
  {
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    mobile: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: validateMobile,
        message: "Invalid Indian mobile number",
      },
    },
    bio: {
      type: String,
      maxlength: 2000,
    },
    experienceInYears: {
      type: Number,
      min: 0,
      required: true,
    },
    languagesSpoken: {
      type: [String],
      default: [],
    },
    expertiseAreas: {
      type: [String],
      default: [],
    },
    preferredIndustries: {
      type: [String],
      default: [],
    },
    availableDays: {
      type: [String],
      enum: [
        "Monday",
        "Friday",
        "Sunday",
        "Tuesday",
        "Wednesday",
        "Saturday",
        "Thursday",
      ],
      default: [],
    },
    communicationModes: {
      type: [String],
      enum: ["Google Meet", "Phone Call", "WhatsApp", "Zoom"],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const VirtualHR = mongoose.model<IVirtualHR>(
  "VirtualHR",
  VirtualHRSchema
);
