import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { extractImageUrl } from "../../admin/community/community.controller";
import {
  PreInterviewed,
  VerificationStatus,
} from "./../../modals/preinterviewd.model";
import { checkAndAssignBadge } from "../candidatebrandingbadge/candidatebrandingbadge.controller";

const PreInterviewedService = new CommonService(PreInterviewed);

export class PreInterviewedController {
  static async createPreInterviewed(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { interviewedAt, remarks } = req.body;
      const { id: user } = (req as any).user;
      const document = req?.body?.document?.[0]?.url;

      if (!remarks || !interviewedAt) {
        return res
          .status(400)
          .json(new ApiError(400, "Remarks and Interviewed At are required."));
      }

      const existingVerificationRecord: any = await PreInterviewed.findOne({
        user,
      });
      if (existingVerificationRecord && document) {
        const s3Key = document.split(".com/")[1];
        await deleteFromS3(s3Key);
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed Doc already exists"));
      }
      const result = await PreInterviewedService.create({
        user,
        document,
        remarks,
        interviewedAt,
      });
      if (!result) {
        return res
          .status(500)
          .json(
            new ApiError(
              500,
              "Something went wrong while creating Pre Interviewed."
            )
          );
      }
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            "Pre Interviewed submitted successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllPreIntervieweds(
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
            remarks: 1,
            document: 1,
            createdAt: 1,
            verifiedAt: 1,
            interviewedAt: 1,
            userEmail: "$userDetails.email",
            userMobile: "$userDetails.mobile",
            userName: "$userDetails.fullName",
            userProfile: "$userDetails.profile",
            profilePicUrl: "$profilePicFile.url",
          },
        },
      ];
      const result = await PreInterviewedService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPreInterviewedById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PreInterviewedService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPreInterviewedDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const result = await PreInterviewed.findOne({ user });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updatePreInterviewedById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Pre Interviewed doc ID"));

      const existingVerificationRecord: any =
        await PreInterviewedService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED)
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed already approved"));

      const { status, remarks, document, slug, interviewedAt } = req.body;
      const normalizedData = {
        remarks: remarks?.trim() || existingVerificationRecord.remarks || "",
        interviewedAt:
          interviewedAt || existingVerificationRecord.interviewedAt || "",
        status:
          status?.toLowerCase() ||
          existingVerificationRecord.status ||
          "pending",
        document: await extractImageUrl(
          document,
          existingVerificationRecord.document
        ),
      };

      if (status === VerificationStatus.APPROVED) {
        await checkAndAssignBadge(existingVerificationRecord.user, slug, {
          assignIfNotExists: true,
        });
      }
      const result = await PreInterviewedService.updateById(
        verificationId,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Pre Interviewed"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deletePreInterviewedById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Pre Interviewed doc ID"));

      const existingVerificationRecord: any =
        await PreInterviewedService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Pre Interviewed Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Pre Interviewed is already approved and cannot be deleted or modified."
            )
          );
      }
      const result = await PreInterviewedService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Pre Interviewed"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
