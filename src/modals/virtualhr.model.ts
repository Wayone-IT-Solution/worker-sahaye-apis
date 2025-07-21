import bcrypt from "bcrypt";
import mongoose, { Schema, Document } from "mongoose";

export interface IVirtualHR extends Document {
  bio?: string;
  name: string;
  email: string;
  mobile: string;
  createdAt: Date;
  updatedAt: Date;
  password: string;
  isActive: boolean;
  availableDays: string[];
  expertiseAreas: string[];
  experienceInYears: number;
  languagesSpoken: string[];
  role: Schema.Types.ObjectId;
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
    password: { type: String, required: true },
    role: {
      ref: "Role",
      required: true,
      type: Schema.Types.ObjectId,
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

// 🔒 Pre-save hook to hash password if modified
VirtualHRSchema.pre<IVirtualHR>("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err as Error);
  }
});

// 🔄 Pre-update hook for findOneAndUpdate / updateOne
async function hashPasswordInUpdate(this: any, next: any) {
  const update = this.getUpdate();
  if (!update) return next();

  const password = update.password || update.$set?.password;
  if (!password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    if (update.password) update.password = hashed;
    if (update.$set?.password) update.$set.password = hashed;

    next();
  } catch (err) {
    next(err);
  }
}

VirtualHRSchema.pre("findOneAndUpdate", hashPasswordInUpdate);
VirtualHRSchema.pre("updateOne", hashPasswordInUpdate);

export const VirtualHR = mongoose.model<IVirtualHR>(
  "VirtualHR",
  VirtualHRSchema
);
