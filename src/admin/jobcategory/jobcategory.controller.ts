import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import JobCategory from "../../modals/jobcategory.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const jobCategoryService = new CommonService(JobCategory);

export class JobcategoryController {
  static async createJobcategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await jobCategoryService.create(req.body);
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

  static async createAllJobcategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await JobCategory.insertMany(req.body);
      if (!result || result.length === 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to insert job categories"));
      }
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Job categories created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllJobcategorys(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await jobCategoryService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getJobcategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await jobCategoryService.getById(req.params.id);
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

  static async updateJobcategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await jobCategoryService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update job category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteJobcategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await jobCategoryService.deleteById(req.params.id);
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
