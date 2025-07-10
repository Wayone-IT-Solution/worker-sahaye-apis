import mongoose, { Schema, model, Document } from "mongoose";

export type EndorsementPerformanceLevel = 1 | 2 | 3 | 4 | 5;
export type EndorsementRespect = "High" | "Moderate" | "Low";
export type EndorsementQuality = "Excellent" | "Good" | "Average" | "Poor";
export type EndorsementTimeline = "On-Time" | "Delayed" | "Ahead of Schedule";

export interface IEndorsement extends Document {
  createdAt: Date;
  updatedAt: Date;
  message?: string;
  fulfilled: boolean;
  wouldRehire?: boolean;
  overallPerformance?: number;
  endorsedBy: mongoose.Types.ObjectId;
  endorsedTo: mongoose.Types.ObjectId;
  respect?: "High" | "Moderate" | "Low";
  connectionId: mongoose.Types.ObjectId;
  timelines?: "On-Time" | "Delayed" | "Ahead of Schedule";
  qualityOfWork?: "Excellent" | "Good" | "Average" | "Poor";
}

const EndorsementSchema = new Schema<IEndorsement>(
  {
    message: {
      trim: true,
      type: String,
      maxlength: 500,
    },
    endorsedBy: {
      index: true,
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId,
    },
    endorsedTo: {
      index: true,
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId,
    },
    connectionId: {
      index: true,
      required: true,
      ref: "Connection",
      type: Schema.Types.ObjectId,
    },
    fulfilled: {
      type: Boolean,
      default: false,
    },
    overallPerformance: {
      type: Number,
      min: [1, "Minimum rating is 1"],
      max: [5, "Maximum rating is 5"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not a valid integer",
      },
      default: 1,
      description: "Overall rating on a scale of 1 to 5",
    },

    timelines: {
      type: String,
      enum: {
        values: ["On-Time", "Delayed", "Ahead of Schedule"],
        message: "{VALUE} is not a valid timeline status",
      },
      default: "On-Time",
      description: "Whether the task was completed on time",
    },

    qualityOfWork: {
      type: String,
      enum: {
        values: ["Excellent", "Good", "Average", "Poor"],
        message: "{VALUE} is not a valid quality level",
      },
      default: "Good",
      description: "Quality level of the work delivered",
    },

    wouldRehire: {
      type: Boolean,
      default: false,
      description: "Indicates if the endorser would rehire the candidate",
    },

    respect: {
      type: String,
      enum: {
        values: ["High", "Moderate", "Low"],
        message: "{VALUE} is not a valid respect level",
      },
      default: "Moderate",
      description: "Respect level the endorser has for the candidate",
    },
  },
  { timestamps: true }
);

// Prevent duplicate endorsements from the same user to the same recipient
EndorsementSchema.index(
  { endorsedBy: 1, endorsedTo: 1 },
  { unique: true }
);

EndorsementSchema.index({ endorsedTo: 1, fulfilled: 1 });
// Optimizes queries for endorsements a user has received, optionally filtered by fulfilled status

EndorsementSchema.index({ endorsedBy: 1, fulfilled: 1 });
// Speeds up finding endorsements made by a user and their status

EndorsementSchema.index({ connectionId: 1 });
// Efficient if checking endorsements by connection (e.g., within a specific relationship)

EndorsementSchema.index({ fulfilled: 1, createdAt: -1 });
// Helpful for reports or filtering unfulfilled/fulfilled endorsements by recent activity

export const Endorsement = model<IEndorsement>("Endorsement", EndorsementSchema);
