import mongoose from "mongoose";

const ServiceLocationSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportService",
      required: [true, "Service ID is required"],
      index: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      maxlength: [100, "State cannot be more than 100 characters"],
      index: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [100, "City cannot be more than 100 characters"],
      index: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [500, "Address cannot be more than 500 characters"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot be more than 500 characters"],
    },
    scheme: {
      type: String,
      default: "none",
    },
    locationType: {
      type: String,
      required: [true, "Location type is required"],
      trim: true,
      maxlength: [100, "Location type cannot be more than 100 characters"],
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Compound index for fetching all locations of a service
ServiceLocationSchema.index({ serviceId: 1, status: 1, state: 1, city: 1 });

export default mongoose.model("ServiceLocation", ServiceLocationSchema);
