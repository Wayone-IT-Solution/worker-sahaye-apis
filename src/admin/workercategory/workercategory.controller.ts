import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import WorkerCategory from "../../modals/workercategory.model";

const workerCategoryService = new CommonService(WorkerCategory);

export class WorkercategoryController {
  static async createWorkercategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await workerCategoryService.create(req.body);
      if (!result) throw new ApiError(400, "Failed to create worker category");
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllWorkercategorys(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await workerCategoryService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getWorkercategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await workerCategoryService.getById(req.params.id);
      if (!result) throw new ApiError(404, "Worker category not found");
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateWorkercategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await workerCategoryService.updateById(
        req.params.id,
        req.body
      );
      if (!result) throw new ApiError(404, "Failed to update worker category");
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteWorkercategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await workerCategoryService.deleteById(req.params.id);
      if (!result) throw new ApiError(404, "Failed to delete worker category");
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
