import mongoose, { Schema, Document, Types, model } from "mongoose";

/** Gender Options */
export type Gender = "male" | "female" | "other";

/** Embedded location */
interface ILocation {
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
}

export interface IPersonalAssistant extends Document {
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
}

const PersonalAssistantSchema = new Schema<IPersonalAssistant>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    profileImageUrl: String,
    address: String,
    location: {
      city: String,
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
  },
  { timestamps: true }
);

export const PersonalAssistant = model<IPersonalAssistant>(
  "PersonalAssistant",
  PersonalAssistantSchema
);
