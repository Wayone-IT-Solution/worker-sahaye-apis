import mongoose, { Schema, Document } from "mongoose";

export interface IEmployerFeedback extends Document {
  createdAt: Date;
  updatedAt: Date;
  testimonial: string;
  paymentsOnTime: boolean;
  wouldRecommend: boolean;
  workEnvironmentRating: number;
  userId: mongoose.Types.ObjectId; // Who is giving the feedback
  employerId: mongoose.Types.ObjectId; // Whom the feedback is for
  communicationTransparencyRating: number;
}

const EmployerFeedbackSchema: Schema = new Schema<IEmployerFeedback>(
  {
    userId: {
      ref: "User",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    employerId: {
      ref: "User",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    workEnvironmentRating: {
      min: 1,
      max: 5,
      type: Number,
      required: true,
    },
    communicationTransparencyRating: {
      min: 1,
      max: 5,
      type: Number,
      required: true,
    },
    paymentsOnTime: {
      type: Boolean,
      required: true,
    },
    wouldRecommend: {
      type: Boolean,
      required: true,
    },
    testimonial: {
      trim: true,
      type: String,
      maxLength: 500,
    },
  },
  { timestamps: true }
);

EmployerFeedbackSchema.index({ userId: 1, employerId: 1 }, { unique: true });

export const EmployerFeedback = mongoose.model<IEmployerFeedback>(
  "EmployerFeedback",
  EmployerFeedbackSchema
);
