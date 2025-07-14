import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import {
  VerificationStatus,
  PreInterviewedContractor,
} from "./../../modals/preinterviewedcontractor.model";
import { checkAndAssignBadge } from "../candidatebrandingbadge/candidatebrandingbadge.controller";

const PreInterviewedContractorService = new CommonService(PreInterviewedContractor);

export class PreInterviewedContractorController {
  static async createPreInterviewedContractor(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const existingVerificationRecord: any = await PreInterviewedContractor.findOne({
        user,
      });
      if (existingVerificationRecord) {
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed Contractor Doc already exists"));
      }
      const result = await PreInterviewedContractorService.create({
        user,
        ...req.body,
      });
      if (!result) {
        return res
          .status(500)
          .json(
            new ApiError(
              500,
              "Something went wrong while creating Pre Interviewed Contractor."
            )
          );
      }
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            "Pre Interviewed Contractor submitted successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllPreInterviewedContractors(
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
            createdAt: 1,
            verifiedAt: 1,
            userEmail: "$userDetails.email",
            userMobile: "$userDetails.mobile",
            userName: "$userDetails.fullName",
            userProfile: "$userDetails.profile",
            profilePicUrl: "$profilePicFile.url",
          },
        },
      ];
      const result = await PreInterviewedContractorService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPreInterviewedContractorById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PreInterviewedContractorService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed Contractor not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPreInterviewedContractorDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const result = await PreInterviewedContractor.findOne({ user });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed Contractor not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updatePreInterviewedContractorById(
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
          .json(new ApiError(400, "Invalid Pre Interviewed Contractor doc ID"));

      const existingVerificationRecord: any =
        await PreInterviewedContractorService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed Contractor Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED)
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed Contractor already approved"));

      const { status, slug } = req.body;
      const normalizedData = {
        status:
          status?.toLowerCase() ||
          existingVerificationRecord.status ||
          "pending",
      };

      if (status === VerificationStatus.APPROVED && role === "admin") {
        await checkAndAssignBadge(existingVerificationRecord.user, slug, {
          assignIfNotExists: true,
          user: { id, role },
        });
      }
      const result = await PreInterviewedContractorService.updateById(
        verificationId,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Pre Interviewed Contractor"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deletePreInterviewedContractorById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Pre Interviewed Contractor doc ID"));

      const existingVerificationRecord: any =
        await PreInterviewedContractorService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed Contractor Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Pre Interviewed Contractor is already approved and cannot be deleted or modified."
            )
          );
      }
      const result = await PreInterviewedContractorService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Pre Interviewed Contractor"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
