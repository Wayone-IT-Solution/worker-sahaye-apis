import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { FastResponder, VerificationStatus } from "../../modals/fastresponder.model";
import { checkAndAssignBadge } from "../candidatebrandingbadge/candidatebrandingbadge.controller";

const fastResponderService = new CommonService(FastResponder);

export class FastResponderController {
  static async createFastResponder(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const existingVerificationRecord: any = await FastResponder.findOne({
        user,
      });
      if (existingVerificationRecord) {
        return res
          .status(404)
          .json(new ApiError(404, "Fast Responder Doc already exists"));
      }
      const result = await fastResponderService.create({ user });
      if (!result) {
        return res
          .status(404)
          .json(
            new ApiError(
              404,
              "Something went wrong while creating Fast Responder."
            )
          );
      }
      return res
        .status(201)
        .json(
          new ApiResponse(201, result, "Fast Responder submitted successfully.")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllFastResponders(
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
            behaviour: 1,
            verifiedAt: 1,
            userEmail: "$userDetails.email",
            userName: "$userDetails.fullName",
            userMobile: "$userDetails.mobile",
            profilePicUrl: "$profilePicFile.url",
          },
        },
      ];
      const result = await fastResponderService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getFastResponderById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await fastResponderService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Fast Responder not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getFastResponderDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const result = await FastResponder.findOne({ user });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Fast Responder not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateFastResponderById(
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
          .json(new ApiError(400, "Invalid Fast Responder doc ID"));

      const existingVerificationRecord: any =
        await fastResponderService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Fast Responder Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED)
        return res
          .status(404)
          .json(new ApiError(404, "Fast Responder already approved"));

      const { status, score, slug, behaviors } = req.body;

      const normalizedData = {
        score,
        status,
        behaviors,
        verifiedAt: status === VerificationStatus.APPROVED && new Date(),
      };

      if (status === VerificationStatus.APPROVED && role === "admin") {
        await checkAndAssignBadge(existingVerificationRecord.user, slug, {
          assignIfNotExists: true,
          user: { id, role },
        });
      }
      const result = await fastResponderService.updateById(
        verificationId,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Fast Responder"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteFastResponderById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Fast Responder doc ID"));

      const existingVerificationRecord: any =
        await fastResponderService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Fast Responder Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Fast Responder is already approved and cannot be deleted or modified."
            )
          );
      }
      const result = await fastResponderService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Fast Responder"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
