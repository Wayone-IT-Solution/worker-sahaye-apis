import mongoose, { Schema, Model } from "mongoose";

export enum JobRoleStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface IJobRole {
  name: string;
  slug: string;
  description?: string;
  status: JobRoleStatus;
  category?: mongoose.Types.ObjectId;
  icon?: string;
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  requiredExperience?: number;
  tags?: string[];
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type JobRoleDocument = IJobRole & mongoose.Document;

const JobRoleSchema = new Schema<JobRoleDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: { type: String, trim: true },

    status: {
      type: String,
      enum: Object.values(JobRoleStatus),
      default: JobRoleStatus.ACTIVE,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "JobCategory",
      index: true,
    },

    icon: String,

    salaryRange: {
      min: { type: Number, min: 0 },
      max: {
        type: Number,
        validate: {
          validator: function (this: JobRoleDocument, value: number) {
            return (
              this.salaryRange?.min == null ||
              value >= this.salaryRange.min
            );
          },
          message: "Max salary must be >= min salary",
        },
      },
      currency: { type: String, default: "INR" },
    },

    requiredExperience: {
      type: Number,
      min: 0,
    },

    tags: [{ type: String, lowercase: true, index: true }],

    createdBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

// Indexes
JobRoleSchema.index({ name: 1 }, { unique: true });
JobRoleSchema.index({ slug: 1 }, { unique: true });
JobRoleSchema.index({ status: 1 });
JobRoleSchema.index({ name: "text", description: "text", tags: "text" });

export const JobRole: Model<JobRoleDocument> = mongoose.model(
  "JobRole",
  JobRoleSchema
);

export default JobRole;
