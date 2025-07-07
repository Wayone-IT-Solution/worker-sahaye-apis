import { Schema, model, Types, Document } from "mongoose";

export interface IJobSave extends Document {
  user: Types.ObjectId;
  job: Types.ObjectId;
  tags?: string[]; // Optional field for tags
}

const JobSaveSchema = new Schema<IJobSave>(
  {
    user: {
      ref: "User",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    tags: {
      type: [String],
      default: [],
      index: true, // Index for faster search
      required: false, // Optional field
    },
    job: {
      ref: "Job",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

// Compound index to speed up lookups per user + tag (for filtering user's saved jobs by tag)
JobSaveSchema.index({ user: 1, tags: 1 });

// Optional: For frequent tag-only based discovery (e.g., trending tags)
JobSaveSchema.index({ tags: 1 });

// Already exists – ensure uniqueness: one user can save a job only once
JobSaveSchema.index({ user: 1, job: 1 }, { unique: true });

// Optional: To sort/paginate user saved jobs by latest
JobSaveSchema.index({ user: 1, createdAt: -1 });

export const JobSave = model<IJobSave>("JobSave", JobSaveSchema);
