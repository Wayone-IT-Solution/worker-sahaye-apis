import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import Industry from "../../modals/industry.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import {
  buildMatchStage,
  buildSortObject,
  buildPaginationResponse,
  SEARCH_FIELD_MAP,
} from "../../utils/queryBuilder";

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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const matchStage = buildMatchStage(
        {
          status: req.query.status as string,
          search: req.query.search as string,
          searchKey: req.query.searchKey as string,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
        },
        SEARCH_FIELD_MAP.industry
      );

      const sortObj = buildSortObject(
        req.query.sortKey as string,
        req.query.sortDir as string
      );

      const total = await Industry.countDocuments(matchStage);
      const industries = await Industry.find(matchStage)
        .populate("createdBy updatedBy", "name email")
        .sort(sortObj)
        .skip(skip)
        .limit(limit);

      return res.status(200).json(
        new ApiResponse(
          200,
          buildPaginationResponse(industries, total, page, limit),
          "Data fetched successfully"
        )
      );
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
