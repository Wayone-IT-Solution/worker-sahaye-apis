import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { SafeWorkplace, VerificationStatus } from "../../modals/safeworkplace.model";
import { checkAndAssignBadge } from "../candidatebrandingbadge/candidatebrandingbadge.controller";

const SafeWorkplaceService = new CommonService(SafeWorkplace);

export class SafeWorkplaceController {
  static async createSafeWorkplace(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const existingVerificationRecord: any = await SafeWorkplace.findOne({
        user,
      });
      if (existingVerificationRecord) {
        return res
          .status(404)
          .json(new ApiError(404, "Safe WorkPlace Doc already exists"));
      }
      const result = await SafeWorkplaceService.create({ user });
      if (!result) {
        return res
          .status(404)
          .json(
            new ApiError(
              404,
              "Something went wrong while creating Safe WorkPlace."
            )
          );
      }
      return res
        .status(201)
        .json(
          new ApiResponse(201, result, "Safe WorkPlace submitted successfully.")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllSafeWorkplaces(
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
      const result = await SafeWorkplaceService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getSafeWorkplaceById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await SafeWorkplaceService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Safe WorkPlace not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getSafeWorkplaceDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const result = await SafeWorkplace.findOne({ user });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Safe WorkPlace not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateSafeWorkplaceById(
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
          .json(new ApiError(400, "Invalid Safe WorkPlace doc ID"));

      const existingVerificationRecord: any =
        await SafeWorkplaceService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Safe WorkPlace Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED)
        return res
          .status(404)
          .json(new ApiError(404, "Safe WorkPlace already approved"));

      const { status, slug } = req.body;

      const normalizedData = {
        status,
        verifiedAt: status === VerificationStatus.APPROVED && new Date(),
      };

      if (status === VerificationStatus.APPROVED && role === "admin") {
        await checkAndAssignBadge(existingVerificationRecord.user, slug, {
          assignIfNotExists: true,
          user: { id, role },
        });
      }
      const result = await SafeWorkplaceService.updateById(
        verificationId,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Safe WorkPlace"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteSafeWorkplaceById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Safe WorkPlace doc ID"));

      const existingVerificationRecord: any =
        await SafeWorkplaceService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Safe WorkPlace Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Safe WorkPlace is already approved and cannot be deleted or modified."
            )
          );
      }
      const result = await SafeWorkplaceService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Safe WorkPlace"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
