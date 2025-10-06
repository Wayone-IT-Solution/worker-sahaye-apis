import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import Industry from "../../modals/industry.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const IndustryService = new CommonService(Industry);

export class IndustryController {
  static async createIndustry(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await IndustryService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create industry"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async createAllIndustry(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await Industry.insertMany(req.body);
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

  static async getAllIndustrys(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await IndustryService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getIndustryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await IndustryService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "industry not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateIndustryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await IndustryService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update industry"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteIndustryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await IndustryService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete industry"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
