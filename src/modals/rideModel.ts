import { Schema, model, Document, Types } from "mongoose";

export enum RideStatus {
  ONGOING = "ongoing",
  REJECTED = "rejected",
  ACCEPTED = "accepted",
  REQUESTED = "requested",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface DropPoint {
  address: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface IRide extends Document {
  user: Types.ObjectId;
  driver?: Types.ObjectId;
  pickup: {
    address: string;
    coordinates: [number, number];
  };
  pin: number;
  isPinVerified: boolean;
  fare?: number;
  promoCode: any;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  distance?: String;
  duration?: number;
  drops: DropPoint[];
  status: RideStatus;
  completedAt?: Date;
  vehicleType: String;
  penaltyAmount: Number;
  driverReachedAt?: Date;
  promoCodeDetails?: any;
  cancellationReason?: string;
  paymentMode?: "cash" | "online";
  cancelledBy?: "user" | "driver" | "system";
}

const dropPointSchema = new Schema<DropPoint>(
  {
    address: { type: String, required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (val: number[]) => val.length === 2,
        message: "Coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false }
);

const rideSchema = new Schema<IRide>(
  {
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },
    user: { type: Schema.Types.ObjectId, ref: "Passenger", required: true },
    pickup: {
      address: { type: String, required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (val: number[]) => val.length === 2,
          message: "Coordinates must be [lng, lat]",
        },
      },
    },
    drops: {
      type: [dropPointSchema],
      required: true,
      validate: {
        validator: (val: DropPoint[]) => val.length > 0,
        message: "At least one drop point is required",
      },
    },
    status: {
      type: String,
      enum: Object.values(RideStatus),
      default: RideStatus.REQUESTED,
    },
    isPinVerified: {
      type: Boolean,
      default: false,
    },
    pin: Number,
    fare: Number,
    startedAt: Date,
    distance: String,
    duration: Number,
    completedAt: Date,
    vehicleType: String,
    driverReachedAt: Date,
    penaltyAmount: {
      type: Number,
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ["cash", "online"],
    },
    cancelledBy: {
      type: String,
      enum: ["user", "driver", "system"],
    },
    cancellationReason: String,
    promoCode: {
      type: Schema.Types.ObjectId || null,
      ref: "Promotion",
      default: null,
    },
    promoCodeDetails: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-save middleware
rideSchema.pre<IRide>("save", function (next) {
  if (this.status === RideStatus.CANCELLED && !this.penaltyAmount) {
    if (this.fare) {
      const penalty = this.fare * 0.1; // 10% penalty
      this.penaltyAmount = penalty;
    }
  }
  // Duration calculation if both timestamps are available
  if (this.startedAt && this.completedAt) {
    const durationInMs = this.completedAt.getTime() - this.startedAt.getTime();
    this.duration = Math.round(durationInMs / 60000); // Convert ms to minutes
  }
  next();
});
// Index on pickup location
rideSchema.index({ "pickup.coordinates": "2dsphere" });
// Index on all drop points
rideSchema.index({ "drops.coordinates": "2dsphere" });

export const Ride = model<IRide>("Ride", rideSchema);
