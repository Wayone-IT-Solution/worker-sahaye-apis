import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import CourseReview from "../../modals/coursereview.model";
import { Enrollment } from "../../modals/enrollment.model";
import { CommonService } from "../../services/common.services";

const CourseReviewService = new CommonService(CourseReview);

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
      const { id: user } = (req as any).user;
      const result = await CourseReviewService.getAll({ ...req.query, user });
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
