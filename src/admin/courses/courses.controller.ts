import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Course } from "../../modals/courses.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const courseService = new CommonService(Course);

export class CourseController {
  static async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await courseService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create course"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await courseService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getCourseById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await courseService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "course not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateCourseById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await courseService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update course"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteCourseById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await courseService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete course"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
