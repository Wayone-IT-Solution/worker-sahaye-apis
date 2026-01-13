import mongoose from "mongoose";

const SupportServiceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    subtitle: {
      type: String,
      required: [true, "Subtitle is required"],
      trim: true,
      maxlength: [150, "Subtitle cannot be more than 150 characters"],
    },
    description: {
      type: [String],
      required: [true, "Description points are required"],
      validate: {
        validator: (v: any) => Array.isArray(v) && v.length > 0,
        message: "Description must have at least one point",
      },
    },
    serviceFor: {
      type: String,
      enum: {
        values: ["ESIC", "EPFO", "LOAN", "LWF"],
        message: "Service type must be one of: ESIC, EPFO, LOAN, LWF",
      },
      required: [true, "Service type (serviceFor) is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
      index: true,
    },
    order: {
      type: Number,
      default: 0,
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

// Text index for full-text search
SupportServiceSchema.index(
  { title: "text", subtitle: "text", description: "text" },
  { default_language: "english" }
);

// Compound index for efficient filtering
SupportServiceSchema.index({ serviceFor: 1, status: 1 });

export default mongoose.model("SupportService", SupportServiceSchema);
