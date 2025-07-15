import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { checkAndAssignBadge } from "../candidatebrandingbadge/candidatebrandingbadge.controller";
import { BestPracticesFacility, VerificationStatus } from "../../modals/bestpracticesfacility.model";

const BestPracticesFacilityService = new CommonService(BestPracticesFacility);

export class BestPracticesFacilityController {
  static async createBestPracticesFacility(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const existingVerificationRecord: any = await BestPracticesFacility.findOne({
        user,
      });
      if (existingVerificationRecord) {
        return res
          .status(404)
          .json(new ApiError(404, "Best Practice & Facility Doc already exists"));
      }
      const result = await BestPracticesFacilityService.create({ user, ...req.body });
      if (!result) {
        return res
          .status(404)
          .json(
            new ApiError(
              404,
              "Something went wrong while creating Best Practice & Facility."
            )
          );
      }
      return res
        .status(201)
        .json(
          new ApiResponse(201, result, "Best Practice & Facility submitted successfully.")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllBestPracticesFacilitys(
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
        {
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
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
            status: 1,
            updatedAt: 1,
            createdAt: 1,
            verifiedAt: 1,
            userEmail: "$userDetails.email",
            userName: "$userDetails.fullName",
            userMobile: "$userDetails.mobile",
            profilePicUrl: "$profilePicFile.url",
          },
        },
      ];
      const result = await BestPracticesFacilityService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getBestPracticesFacilityById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await BestPracticesFacilityService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Best Practice & Facility not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getBestPracticesFacilityDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const result = await BestPracticesFacility.findOne({ user });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Best Practice & Facility not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateBestPracticesFacilityById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id, role } = (req as any).user;
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Best Practice & Facility doc ID"));

      const existingVerificationRecord: any =
        await BestPracticesFacilityService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Best Practice & Facility Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED)
        return res
          .status(404)
          .json(new ApiError(404, "Best Practice & Facility already approved"));

      const { status, slug } = req.body;

      const normalizedData = {
        status,
        verifiedAt: status === VerificationStatus.APPROVED ? new Date() : null,
      };

      if (status === VerificationStatus.APPROVED && role === "admin") {
        await checkAndAssignBadge(existingVerificationRecord.user, slug, {
          assignIfNotExists: true,
          user: { id, role },
        });
      }
      const result = await BestPracticesFacilityService.updateById(
        verificationId,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Best Practice & Facility"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteBestPracticesFacilityById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Best Practice & Facility doc ID"));

      const existingVerificationRecord: any =
        await BestPracticesFacilityService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Best Practice & Facility Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Best Practice & Facility is already approved and cannot be deleted or modified."
            )
          );
      }
      const result = await BestPracticesFacilityService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Best Practice & Facility"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
