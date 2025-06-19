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

JobSaveSchema.index({ user: 1, job: 1 }, { unique: true });
export const JobSave = model<IJobSave>("JobSave", JobSaveSchema);
