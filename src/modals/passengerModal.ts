import mongoose, { Schema, Document } from "mongoose";

/**
 * Passenger Schema
 * @typedef {Object} Passenger
 * @property {string} email - Unique email address
 * @property {string} phoneNumber - Contact number
 * @property {string} name - Full name of the passenger
 * @property {Date} updatedAt - Record update timestamp
 * @property {Date} createdAt - Record creation timestamp
 * @property {string} status - Account status: active, inactive or blocked
 * @property {string} role - Defaults to 'passenger'
 */
export interface IPassenger extends Document {
  name: string;
  email: string;
  fcmToken: string;
  phoneNumber: string;
  status: "active" | "inactive" | "blocked";
  role: "passenger";
  block(): void;
  deactivate(): void;
  activate(): void;
  unblock(): void;
  createdAt: Date;
  updatedAt: Date;
}

const passengerSchema = new Schema<IPassenger>(
  {
    name: { type: String, required: true },
    fcmToken: { type: String },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },
    role: {
      type: String,
      enum: ["passenger"],
      default: "passenger",
      required: true,
    },
  },
  { timestamps: true }
);

// 🚫 Block the user
passengerSchema.methods.block = function () {
  this.status = "blocked";
};

// 🔒 Deactivate (soft-remove) the user
passengerSchema.methods.deactivate = function () {
  this.status = "inactive";
};

// ✅ Reactivate the user from inactive
passengerSchema.methods.activate = function () {
  this.status = "active";
};

// ✅ Unblock the user
passengerSchema.methods.unblock = function () {
  this.status = "active";
};

const Passenger = mongoose.model<IPassenger>("Passenger", passengerSchema);

export default Passenger;
