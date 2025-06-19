import ApiError from "../../utils/ApiError";
import { Job } from "../../modals/job.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const JobService = new CommonService(Job);

export class JobController {
  static async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const data = {
        ...req.body,
        postedBy: (req as any).user.id,
      };
      const result = await JobService.create(data);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create worker category"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JobService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JobService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Worker category not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JobService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update worker category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JobService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete worker category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateJobStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { status } = req.body;
      if (!status)
        return res.status(400).json(new ApiError(400, "Status is required"));

      const result = await JobService.updateById(req.params.id, { status });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update job status"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Job status updated successfully"));
    } catch (err) {
      next(err);
    }
  }
}
