import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import CourseReview from "../../modals/coursereview.model";
import { Enrollment } from "../../modals/enrollment.model";
import { CommonService } from "../../services/common.services";
import mongoose from "mongoose";

const CourseReviewService = new CommonService(CourseReview);

export const getReviewStats = async (courseId: string) => {
  try {
    const matchQuery = { courseId: new mongoose.Types.ObjectId(courseId) };

    const groupedStats = await CourseReview.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const overallStats = await CourseReview.aggregate([
      { $match: matchQuery },
      {
        $group: { _id: null, total: { $sum: 1 }, average: { $avg: "$rating" } },
      },
    ]);

    const totalReviews = overallStats[0]?.total || 0;
    const averageRating = overallStats[0]?.average || 0;

    const ratingsBreakdown: Record<
      number,
      { count: number; percentage: number }
    > = {
      1: { count: 0, percentage: 0 },
      2: { count: 0, percentage: 0 },
      3: { count: 0, percentage: 0 },
      4: { count: 0, percentage: 0 },
      5: { count: 0, percentage: 0 },
    };

    groupedStats.forEach((item) => {
      const percent =
        totalReviews > 0
          ? parseFloat(((item.count / totalReviews) * 100).toFixed(2))
          : 0;

      ratingsBreakdown[item._id] = {
        count: item.count,
        percentage: percent,
      };
    });

    return {
      totalReviews,
      averageRating: parseFloat(averageRating.toFixed(2)),
      ratingsBreakdown,
    };
  } catch (error) {
    console.error("Failed to generate review stats:", error);
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingsBreakdown: {
        1: { count: 0, percentage: 0 },
        2: { count: 0, percentage: 0 },
        3: { count: 0, percentage: 0 },
        4: { count: 0, percentage: 0 },
        5: { count: 0, percentage: 0 },
      },
    };
  }
};

export class CourseReviewController {
  static async createCourseReview(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId } = (req as any).user;
      const { rating, comment, courseId } = req.body;
      const isUserEnrolled = await Enrollment.findOne({
        user: userId,
        course: courseId,
      });

      if (!isUserEnrolled) {
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              "You must be enrolled in the course to submit a review."
            )
          );
      }

      const userExists = await CourseReview.findOne({ userId, courseId });
      if (userExists) {
        return res
          .status(409)
          .json(
            new ApiError(
              409,
              "You have already submitted a review for this course."
            )
          );
      }

      const data = { rating, comment, courseId, userId };
      const result = await CourseReviewService.create(data);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create job category"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllCourseReviews(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user, role } = (req as any).user;
      const result = await CourseReviewService.getAll({
        ...req.query,
        user: role === "worker" ? user : "",
      });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getCourseReviewById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await CourseReviewService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Job category not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteCourseReviewById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await CourseReviewService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete job category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
