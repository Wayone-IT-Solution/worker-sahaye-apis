import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { CandidateBrandingBadge } from "../../modals/candidatebrandingbadge.model";

const candidateBrandingBadgesService = new CommonService(
  CandidateBrandingBadge
);

export class CandidateBrandingBadgeController {
  static async createCandidateBrandingBadge(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await candidateBrandingBadgesService.create(req.body);
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

  static async getAllCandidateBrandingBadges(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $project: {
            _id: 1,
            badge: 1,
            status: 1,
            metaData: 1,
            earnedBy: 1,
            createdAt: 1,
            assignedAt: 1,
            "userDetails.email": 1,
            "userDetails.mobile": 1,
            "userDetails.fullName": 1,
          },
        },
      ];
      const result = await candidateBrandingBadgesService.getAll(
        req.query,
        pipeline
      );
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getCandidateBrandingBadgeById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await candidateBrandingBadgesService.getById(
        req.params.id
      );
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

  static async updateCandidateBrandingBadgeById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await candidateBrandingBadgesService.updateById(
        req.params.id,
        req.body
      );
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

  static async deleteCandidateBrandingBadgeById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await candidateBrandingBadgesService.deleteById(
        req.params.id
      );
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
}
