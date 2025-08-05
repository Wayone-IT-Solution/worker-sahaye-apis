import ApiError from "../../utils/ApiError";
import { User } from "../../modals/user.model";
import { Badge } from "../../modals/badge.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { sendSingleNotification } from "../../services/notification.service";
import { CandidateBrandingBadge } from "../../modals/candidatebrandingbadge.model";

const candidateBrandingBadgesService = new CommonService(
  CandidateBrandingBadge
);

export const checkAndAssignBadge = async (
  userId: any,
  badgeSlug: string,
  options?: {
    user?: any;
    assignIfNotExists?: boolean;
    extraData?: Record<string, any>;
  }
) => {
  const badge = await Badge.findOne({ slug: badgeSlug });
  if (!badge) return;

  const existingBadge = await CandidateBrandingBadge.findOne({
    user: userId,
    badge: badge.slug,
  });

  // Already assigned and active → do nothing
  if (existingBadge?.status === "active") return;

  // Assign or reactivate if flag is true
  if (options?.assignIfNotExists) {
    if (existingBadge) {
      await CandidateBrandingBadge.findByIdAndUpdate(existingBadge._id, {
        status: "active",
        earnedBy: "manual",
        assignedAt: new Date(),
        metaData: options.extraData || {},
      });
    } else {
      await CandidateBrandingBadge.create({
        user: userId,
        status: "active",
        badge: badge.name,
        earnedBy: "manual",
        assignedAt: new Date(),
        metaData: options?.extraData || {},
      });
    }

    const userDetails = await User.findById(userId);
    if (userDetails) {
      await sendSingleNotification({
        type: "badge-earned",
        context: {
          badgeName: badge.name,
          userName: userDetails.fullName,
        },
        toUserId: userId,
        toRole: userDetails.userType,
        fromUser: {
          id: options?.user?.id,
          role: options?.user?.role,
        },
      });
    }
  }
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
      const { userType } = req.params;
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        ...(userType
          ? [{ $match: { "userDetails.userType": userType } }]
          : []),
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$userDetails._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePicFile",
          },
        },
        {
          $unwind: {
            path: "$profilePicFile",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            badge: 1,
            status: 1,
            earnedBy: 1,
            createdAt: 1,
            udpatedAt: 1,
            assignedAt: 1,
            userEmail: "$userDetails.email",
            userName: "$userDetails.fullName",
            userMobile: "$userDetails.mobile",
            userType: "$userDetails.userType",
            profilePicUrl: "$profilePicFile.url",
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
