import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Feature } from "../../modals/feature.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const featureService = new CommonService(Feature);

export class FeatureController {
  static async createFeature(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await featureService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create feature"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllFeatures(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await featureService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getFeatureById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await featureService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "feature not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateFeatureById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await featureService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update feature"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteFeatureById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await featureService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete feature"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
