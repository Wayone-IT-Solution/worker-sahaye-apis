import mongoose, { Schema, Document } from "mongoose";

/**
 * Driver Document Interface
 */
export interface IDriver extends Document {
  name: string;
  email: string;
  fcmToken: string;
  phoneNumber: string;
  description: string;
  isMobileVerified: boolean;
  avatarUrl?: string;
  vehicle: {
    type: string;
    number: string;
    color?: string;
    model?: string;
  };
  documents: {
    license: string;
    registration: string;
    insurance?: string;
  };
  kycVerified: boolean;
  commissionPercentage: Number;
  approvalStatus: "pending" | "approved" | "rejected";
  status: "active" | "inactive" | "suspended" | "blocked";
  rating: number;
  earnings: number;
  ridesCompleted: number;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdAt: Date;
  updatedAt: Date;

  approve(): void;
  reject(): void;
  suspend(): void;
  activate(): void;
  block(): void;
  unblock(): void;
}

const driverSchema = new Schema<IDriver>(
  {
    avatarUrl: { type: String },
    description: { type: String },
    isMobileVerified: { type: Boolean, default: false },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },

    vehicle: {
      type: {
        type: String,
        enum: ["suv", "sedan", "bike", "auto", "scooter", "car"],
      },
      number: { type: String, default: "" },
      model: { type: String },
      color: { type: String },
    },

    documents: {
      license: { type: String },
      adhaarCard: { type: String },
    },

    fcmToken: { type: String },
    kycVerified: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "blocked"],
      default: "inactive",
    },

    rating: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    ridesCompleted: { type: Number, default: 0 },
    commissionPercentage: { type: Number, default: 10 },

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true }
);

driverSchema.index({ location: "2dsphere" });

const Driver = mongoose.model<IDriver>("Driver", driverSchema);
export default Driver;
