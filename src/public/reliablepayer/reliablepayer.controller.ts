import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { ReliablePayer, VerificationStatus } from "../../modals/reliablepayer.model";
import { checkAndAssignBadge } from "../candidatebrandingbadge/candidatebrandingbadge.controller";

const ReliablePayerService = new CommonService(ReliablePayer);

export class ReliablePayerController {
  static async createReliablePayer(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const existingVerificationRecord: any = await ReliablePayer.findOne({
        user,
      });
      if (existingVerificationRecord) {
        return res
          .status(404)
          .json(new ApiError(404, "Reliable Payer Doc already exists"));
      }
      const result = await ReliablePayerService.create({ user, ...req.body });
      if (!result) {
        return res
          .status(404)
          .json(
            new ApiError(
              404,
              "Something went wrong while creating Reliable Payer."
            )
          );
      }
      return res
        .status(201)
        .json(
          new ApiResponse(201, result, "Reliable Payer submitted successfully.")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllReliablePayers(
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
      const result = await ReliablePayerService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getReliablePayerById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await ReliablePayerService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Reliable Payer not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getReliablePayerDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const result = await ReliablePayer.findOne({ user });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Reliable Payer not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateReliablePayerById(
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
          .json(new ApiError(400, "Invalid Reliable Payer doc ID"));

      const existingVerificationRecord: any =
        await ReliablePayerService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Reliable Payer Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED)
        return res
          .status(404)
          .json(new ApiError(404, "Reliable Payer already approved"));

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
      const result = await ReliablePayerService.updateById(
        verificationId,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Reliable Payer"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteReliablePayerById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Reliable Payer doc ID"));

      const existingVerificationRecord: any =
        await ReliablePayerService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Reliable Payer Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Reliable Payer is already approved and cannot be deleted or modified."
            )
          );
      }
      const result = await ReliablePayerService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Reliable Payer"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
