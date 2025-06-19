import { Schema, model, Types, Document } from "mongoose";

export interface IJobSave extends Document {
  user: Types.ObjectId;
  job: Types.ObjectId;
}

const JobSaveSchema = new Schema<IJobSave>(
  {
    user: {
      ref: "User",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
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
