import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Interface for Course Review
 */
export interface ICourseReview extends Document {
  rating: number;
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isVerified?: boolean;
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
}

/**
 * Schema for Course Review
 */
const CourseReviewSchema: Schema<ICourseReview> = new Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Course",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

CourseReviewSchema.index({ courseId: 1, userId: 1 }, { unique: true });

const CourseReview: Model<ICourseReview> = mongoose.model<ICourseReview>(
  "CourseReview",
  CourseReviewSchema
);

export default CourseReview;
