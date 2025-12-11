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

CourseReviewSchema.index({ courseId: 1, userId: 1 }, { unique: true }); // Prevents duplicate reviews by the same user for a course
CourseReviewSchema.index({ rating: 1 });        // Helps in rating-based filtering/sorting (e.g., average rating queries)
CourseReviewSchema.index({ isVerified: 1 });    // Efficient for filtering verified vs unverified reviews
CourseReviewSchema.index({ createdAt: -1 });    // Optimized for fetching latest reviews quickly

const CourseReview: Model<ICourseReview> = mongoose.model<ICourseReview>(
  "CourseReview",
  CourseReviewSchema
);

export default CourseReview;
