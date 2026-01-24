import mongoose, { Schema, Document, Types } from "mongoose";

export interface IJobView extends Document {
    user: Types.ObjectId;
    job: Types.ObjectId;
    viewedAt: Date;
    monthKey: string; // YYYY-MM (for fast monthly queries)
}

const JobViewSchema = new Schema<IJobView>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        job: {
            type: Schema.Types.ObjectId,
            ref: "Job",
            required: true,
            index: true,
        },
        viewedAt: {
            type: Date,
            default: Date.now,
        },
        monthKey: {
            type: String,
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

/**
 * 🚫 Prevent duplicate views of same job in same month
 */
JobViewSchema.index(
    { user: 1, job: 1, monthKey: 1 },
    { unique: true }
);

/**
 * ⏳ Auto-delete job views after ~1 month
 */
// JobViewSchema.index(
//     { viewedAt: 1 },
//     { expireAfterSeconds: 60 * 60 * 24 * 32 } // 32 days
// );

export const JobView = mongoose.model<IJobView>(
    "JobView",
    JobViewSchema
);
