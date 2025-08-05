import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { HighlyPreferred, VerificationStatus } from "../../modals/highlypreferred.model";
import { checkAndAssignBadge } from "../candidatebrandingbadge/candidatebrandingbadge.controller";

const highlyPreferredService = new CommonService(HighlyPreferred);

export class HighlyPreferredController {
  static async createHighlyPreferred(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const existingVerificationRecord: any = await HighlyPreferred.findOne({
        user,
      });
      if (existingVerificationRecord) {
        return res
          .status(404)
          .json(new ApiError(404, "Highly Preferred Doc already exists"));
      }
      const result = await highlyPreferredService.create({ user });
      if (!result) {
        return res
          .status(404)
          .json(
            new ApiError(
              404,
              "Something went wrong while creating Highly Preferred."
            )
          );
      }
      return res
        .status(201)
        .json(
          new ApiResponse(201, result, "Highly Preferred submitted successfully.")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllHighlyPreferreds(
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
            score: 1,
            status: 1,
            updatedAt: 1,
            createdAt: 1,
            behaviour: 1,
            verifiedAt: 1,
            userEmail: "$userDetails.email",
            userName: "$userDetails.fullName",
            userMobile: "$userDetails.mobile",
            profilePicUrl: "$profilePicFile.url",
          },
        },
      ];
      const result = await highlyPreferredService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getHighlyPreferredById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await highlyPreferredService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Highly Preferred not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getHighlyPreferredDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const result = await HighlyPreferred.findOne({ user });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Highly Preferred not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateHighlyPreferredById(
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
          .json(new ApiError(400, "Invalid Highly Preferred doc ID"));

      const existingVerificationRecord: any =
        await highlyPreferredService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Highly Preferred Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED)
        return res
          .status(404)
          .json(new ApiError(404, "Highly Preferred already approved"));

      const { status, score, slug, behaviors } = req.body;

      const normalizedData = {
        score,
        status,
        behaviors,
        verifiedAt: status === VerificationStatus.APPROVED ? new Date() : null,
      };

      if (status === VerificationStatus.APPROVED && role === "admin") {
        await checkAndAssignBadge(existingVerificationRecord.user, slug, {
          assignIfNotExists: true,
          user: { id, role },
        });
      }
      const result = await highlyPreferredService.updateById(
        verificationId,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Highly Preferred"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteHighlyPreferredById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Highly Preferred doc ID"));

      const existingVerificationRecord: any =
        await highlyPreferredService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Highly Preferred Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Highly Preferred is already approved and cannot be deleted or modified."
            )
          );
      }
      const result = await highlyPreferredService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Highly Preferred"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
