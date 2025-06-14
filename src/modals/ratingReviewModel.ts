import { Schema, model, Types, Document } from "mongoose";

export enum AdminAction {
  NONE = "none",
  WARNING = "warning",
  SUSPENDED = "suspended",
}

export interface IRatingReview extends Document {
  rideId: Types.ObjectId;
  driver: Types.ObjectId; // always driver only
  rating: number;
  review?: string;
  tags?: string[];
  adminAction?: AdminAction;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ratingReviewSchema = new Schema<IRatingReview>(
  {
    rideId: { type: Schema.Types.ObjectId, ref: "Ride", required: true },
    driver: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      maxlength: 1000,
    },
    tags: [
      {
        type: String,
        enum: [
          "Late Arrival",
          "Rude Behavior",
          "Clean Vehicle",
          "Safe Driving",
          "No Show",
          "Inappropriate Conduct",
        ],
      },
    ],
    adminAction: {
      type: String,
      enum: Object.values(AdminAction),
      default: AdminAction.NONE,
    },
    adminNotes: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

ratingReviewSchema.index({ driver: 1 });

export const RatingReview = model<IRatingReview>(
  "RatingReview",
  ratingReviewSchema,
);
