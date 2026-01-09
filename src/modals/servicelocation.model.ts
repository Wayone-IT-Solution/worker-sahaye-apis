import mongoose from "mongoose";

const ServiceLocationSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportService",
      required: [true, "Service ID is required"],
      index: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: [150, "Location cannot be more than 150 characters"],
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

// Compound unique index for efficient filtering - serviceId + location must be unique together
ServiceLocationSchema.index({ serviceId: 1, location: 1 }, { unique: true });

// Compound index for fetching all locations of a service
ServiceLocationSchema.index({ serviceId: 1, status: 1 });

export default mongoose.model("ServiceLocation", ServiceLocationSchema);
