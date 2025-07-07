import { Schema, model, Document, Types } from "mongoose";

export enum ApplicationStatus {
  HIRED = "hired",
  APPLIED = "applied",
  OFFERED = "offered",
  REJECTED = "rejected",
  INTERVIEW = "interview",
  WITHDRAWN = "withdrawn",
  SHORTLISTED = "shortlisted",
  UNDER_REVIEW = "under_review",
  OFFERDECLINED = "offer_declined",
  OFFERACCEPTED = "offer_accepted",
}

export interface IAnswer {
  questionId: Types.ObjectId;
  answer: string | boolean | string[];
}

export interface IJobApplication extends Document {
  job: Types.ObjectId;
  applicant: Types.ObjectId;
  applicantSnapshot: {
    name: string;
    email: string;
    phone?: string;
  };
  resumeUrl: string;
  answers?: IAnswer[];
  coverLetter?: string;
  availability?: string;
  interviewMode?: string;
  expectedSalary?: number;
  status: ApplicationStatus;
  interviewModeAccepted?: boolean;
  history: {
    changedAt: Date;
    status: ApplicationStatus;
  }[];
}

const JobApplicationSchema = new Schema<IJobApplication>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    applicant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applicantSnapshot: {
      phone: { type: String },
      name: { type: String, required: true },
      email: { type: String, required: true },
    },
    coverLetter: { type: String },
    resumeUrl: { type: String, required: true },
    answers: [
      {
        answer: Schema.Types.Mixed,
        questionId: { type: Schema.Types.ObjectId, required: true },
      },
    ],
    expectedSalary: { type: Number },
    availability: { type: String },

    status: {
      type: String,
      required: true,
      default: ApplicationStatus.APPLIED,
      enum: Object.values(ApplicationStatus),
    },
    interviewMode: {
      type: String,
      required: true,
      default: "in-person",
      enum: ["in-person", "online"],
    },
    interviewModeAccepted: { type: Boolean, default: false },
    // History of status changes
    history: [
      {
        status: {
          type: String,
          enum: Object.values(ApplicationStatus),
        },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

JobApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
// For filtering by status (e.g., 'under_review', 'hired')
JobApplicationSchema.index({ status: 1 });

// For filtering all applications of a user by status
JobApplicationSchema.index({ applicant: 1, status: 1 });

// For filtering by job and status (e.g., dashboard or employer-side usage)
JobApplicationSchema.index({ job: 1, status: 1 });

// For tracking interviewMode filtering (rare, but useful if used in analytics)
JobApplicationSchema.index({ interviewMode: 1 });

export const JobApplication = model<IJobApplication>(
  "JobApplication",
  JobApplicationSchema
);
