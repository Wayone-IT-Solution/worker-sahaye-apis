import mongoose, { Schema, Document, model, Types } from "mongoose";

/** Gender Options */
export type Gender = "male" | "female" | "other";

/** Embedded location */
interface ILocation {
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
}

/** Call Support Agent Schema Interface */
export interface ICallSupportAgent extends Document {
  name: string;
  email: string;
  gender?: Gender;
  address?: string;
  location?: ILocation;
  phoneNumber: string;
  profileImageUrl?: string;
  role: Types.ObjectId;
  isActive: boolean;
  verified: boolean;
  dateOfBirth?: Date;
  languagesSpoken?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const CallSupportAgentSchema = new Schema<ICallSupportAgent>(
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
    isActive: {
      type: Boolean,
      default: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    languagesSpoken: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const CallSupportAgent = model<ICallSupportAgent>(
  "CallSupportAgent",
  CallSupportAgentSchema
);
