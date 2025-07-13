import ApiError from "../../utils/ApiError";
import { Badge } from "../../modals/badge.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { CandidateBrandingBadge } from "../../modals/candidatebrandingbadge.model";

const candidateBrandingBadgesService = new CommonService(
  CandidateBrandingBadge
);

export const checkAndAssignBadge = async (
  userId: any,
  badgeSlug: string,
  options?: { assignIfNotExists?: boolean; extraData?: Record<string, any> }
) => {
  const badge = await Badge.findOne({ slug: badgeSlug });
  if (!badge) {
    return {
      badge: null,
      success: false,
      message: `Badge '${badgeSlug}' not found.`,
    };
  }
  const alreadyEarned = await CandidateBrandingBadge.findOne({
    user: userId,
    status: "active",
    badge: badge.slug,
  });
  if (alreadyEarned) {
    return {
      badge,
      success: false,
      message: `User already has the '${badge.name}' badge.`,
    };
  }
  if (options?.assignIfNotExists) {
    const existing = await CandidateBrandingBadge.findOne({
      user: userId,
      badge: badge.slug,
    });
    if (existing) {
      const updated = await CandidateBrandingBadge.findByIdAndUpdate(
        existing._id,
        {
          status: "active",
          earnedBy: "manual",
          assignedAt: new Date(),
          metaData: options?.extraData || {},
        },
        { new: true }
      );
      return {
        badge,
        success: true,
        assigned: updated,
        message: `Badge '${badge.name}' was already assigned — updated successfully.`,
      };
    } else {
      const assigned = await CandidateBrandingBadge.create({
        user: userId,
        badge: badge._id,
        status: "active",
        earnedBy: "manual",
        assignedAt: new Date(),
        metaData: options?.extraData || {},
      });
      return {
        badge,
        assigned,
        success: true,
        message: `Badge '${badge.name}' assigned to user.`,
      };
    }
  }
  return {
    badge,
    success: true,
    message: `Badge '${badge.name}' is valid and not yet assigned.`,
  };
};

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
