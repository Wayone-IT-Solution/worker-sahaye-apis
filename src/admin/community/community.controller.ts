import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { Community } from "../../modals/community.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { CommunityMember } from "../../modals/communitymember.model";

const communityService = new CommonService(Community);

export const extractImageUrl = async (input: any, existing: string) => {
  if (!input || (Array.isArray(input) && input.length === 0))
    return existing || "";
  if (Array.isArray(input) && input.length > 0) {
    const newUrl = input[0]?.url;
    if (existing && existing !== newUrl) {
      const s3Key = existing.split(".com/")[1];
      await deleteFromS3(s3Key);
    }
    return newUrl || "";
  }
  if (typeof input === "string") return input;
  return existing || "";
};

export class CommunityController {
  static async createCommunity(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      let { tags } = req.body;
      const data = {
        ...req.body,
        location: {
          city: req?.body?.city,
          state: req?.body?.state,
        },
        bannerImage: req?.body?.bannerImage[0]?.url,
        profileImage: req?.body?.profileImage[0]?.url,
      };

      delete data.city;
      delete data.state;
      if (typeof tags === "string") req.body.tags = tags.split(",");
      const result = await communityService.create(data);
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

  static async getAllCommunitys(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await communityService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllCommunitySuggestions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId } = (req as any).user;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Step 1: Get all joined community IDs for the user
      const joinedCommunities = await CommunityMember.find({
        user: new mongoose.Types.ObjectId(userId),
      });

      const joinedCommunityIds = joinedCommunities.map(
        (cm) => cm.community
      );

      // Step 2: Query communities excluding the above
      const query: any = {
        _id: { $nin: joinedCommunityIds },
        status: "active",
      };

      const totalCount = await Community.countDocuments(query);
      const result = await Community.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      return res.status(200).json(
        new ApiResponse(200, {
          result,
          pagination: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        }, "Community suggestions fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAllMyCommunities(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId } = (req as any).user;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const matchStage = {
        user: new mongoose.Types.ObjectId(userId),
        status: "joined",
      };
      const pipeline = [
        { $match: matchStage },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "communities",
            localField: "community",
            foreignField: "_id",
            as: "communityDetails",
          },
        },
        { $unwind: "$communityDetails" },
        {
          $project: {
            _id: 1,
            name: "$communityDetails.name",
            communityId: "$communityDetails._id",
            communityName: "$communityDetails.name",
            communityStats: "$communityDetails.stats",
            communityLogo: "$communityDetails.profileImage",
            communityBanner: "$communityDetails.bannerImage",
            communityDescription: "$communityDetails.shortDescription",
          },
        },
      ];

      const totalCount = await CommunityMember.countDocuments(matchStage);
      const data = await CommunityMember.aggregate(pipeline);

      return res.status(200).json(
        new ApiResponse(200, {
          result: data,
          pagination: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        }, "Communities fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getCommunityById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { role } = (req as any)?.user;
      const result = await communityService.getById(req.params.id, role !== "admin");
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

  static async updateCommunityById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const communityId = req.params.id;
      let { tags } = req.body;
      if (typeof tags === "string") req.body.tags = tags.split(",");

      if (!mongoose.Types.ObjectId.isValid(communityId))
        return res.status(400).json(new ApiError(400, "Invalid community ID"));

      const existingCommunity: any = await communityService.getById(
        communityId
      );
      if (!existingCommunity)
        return res.status(404).json(new ApiError(404, "Community not found"));

      const { city, state, bannerImage, profileImage, ...rest } = req.body;
      const normalizedData = {
        ...rest,
        location: {
          city: city || existingCommunity?.location?.city || undefined,
          state: state || existingCommunity?.location?.state || undefined,
        },
        bannerImage: await extractImageUrl(
          bannerImage,
          existingCommunity?.bannerImage
        ),
        profileImage: await extractImageUrl(
          profileImage,
          existingCommunity?.profileImage
        ),
      };
      delete normalizedData._id;
      delete normalizedData.city;
      delete normalizedData.state;
      const result = await communityService.updateById(
        req.params.id,
        normalizedData
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

  static async deleteCommunityById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await communityService.deleteById(req.params.id);
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
