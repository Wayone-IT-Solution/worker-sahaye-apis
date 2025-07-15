import ApiError from "../../utils/ApiError";
import { Badge } from "../../modals/badge.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { CandidateBrandingBadge } from "../../modals/candidatebrandingbadge.model";

const badgeService = new CommonService(Badge);

export class BadgeController {
  static async createBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await badgeService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create badge"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllBadges(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await badgeService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllUserBadges(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, id: userId } = (req as any).user;
      const allRoleBadges = await Badge.find({ userTypes: role });
      let userBadgeRequests = [];
      userBadgeRequests = await CandidateBrandingBadge.find(
        { user: userId },
        { badge: 1, status: 1 }
      );
      const badgeStatusMap = new Map<string, string>();
      userBadgeRequests.forEach((item) => {
        badgeStatusMap.set(item.badge, item.status);
      });
      const badgeList = allRoleBadges.map((badge) => {
        const badgeName = badge.name;
        const rawStatus = badgeStatusMap.get(badgeName);
        const status = rawStatus === "pending"
          ? "requested"
          : rawStatus || "pending";
        return { ...badge.toJSON(), status };
      });
      return res
        .status(200)
        .json(new ApiResponse(200, badgeList, "Badges fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getBadgeById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await badgeService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "badge not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateBadgeById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await badgeService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update badge"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteBadgeById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await badgeService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete badge"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
