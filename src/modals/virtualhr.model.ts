import mongoose, { Schema, Document, Types } from "mongoose";

export interface IVirtualHR extends Document {
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isAvailable: boolean;
  userId: Types.ObjectId;
  availableDays: string[];
  expertiseAreas: string[];
  experienceInYears: number;
  languagesSpoken: string[];
  preferredIndustries: string[];
  workingHours: { from: string; to: string };
  communicationModes: ("Google Meet" | "Phone Call" | "WhatsApp" | "Zoom" | string)[];
}

const VirtualHRSchema = new Schema<IVirtualHR>(
  {
    userId: {
      ref: "Admin",
      index: true,
      unique: true,
      required: true,
      type: Schema.Types.ObjectId,
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
    workingHours: {
      from: { type: String, required: true },
      to: { type: String, required: true },
    },
    availableDays: {
      type: [String],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      default: [],
    },
    communicationModes: {
      type: [String],
      enum: ["Google Meet", "Phone Call", "WhatsApp", "Zoom"],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true,
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
