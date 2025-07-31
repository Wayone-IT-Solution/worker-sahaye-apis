import bcrypt from "bcrypt";
import mongoose, { Schema, Document } from "mongoose";

export interface ISalesperson extends Document {
  name: string;
  email: string;
  mobile: string;
  createdAt: Date;
  updatedAt: Date;
  password: string;
  isActive: boolean;
  regions: string[];
  yearsOfExperience: number;
  targetIndustries: string[];
  role: Schema.Types.ObjectId;
  communicationModes: ("Email" | "Phone Call" | "WhatsApp" | "Zoom" | string)[];
}

// --- Custom Mobile Validator ---
const validateMobile = (mobile: string): boolean => {
  return /^[6-9]\d{9}$/.test(mobile); // Indian mobile number
};

const SalespersonSchema = new Schema<ISalesperson>(
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
    password: { type: String, required: true },
    role: {
      ref: "Role",
      required: true,
      type: Schema.Types.ObjectId,
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
      required: true,
    },
    regions: {
      type: [String],
      default: [],
    },
    targetIndustries: {
      type: [String],
      default: [],
    },
    communicationModes: {
      type: [String],
      enum: ["Email", "Phone Call", "WhatsApp", "Zoom"],
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
SalespersonSchema.pre<ISalesperson>("save", async function (next) {
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

SalespersonSchema.pre("findOneAndUpdate", hashPasswordInUpdate);
SalespersonSchema.pre("updateOne", hashPasswordInUpdate);

export const Salesperson = mongoose.model<ISalesperson>(
  "Salesperson",
  SalespersonSchema
);
