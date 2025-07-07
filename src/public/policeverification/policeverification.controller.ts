import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { extractImageUrl } from "../../admin/community/community.controller";
import { CandidateBrandingBadge } from "../../modals/candidatebrandingbadge.model";
import { PoliceVerification, VerificationStatus } from "../../modals/policeverification.model";

const policeVerificationService = new CommonService(PoliceVerification);

export class PoliceVerificationController {
  static async createPoliceVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const name = req.body.name;
      const { id: user } = (req as any).user;
      const document = req?.body?.document?.[0]?.url;

      if (!document || !name) {
        return res
          .status(400)
          .json(new ApiError(400, "Name and document are required."));
      }

      const existingVerificationRecord: any = await PoliceVerification.findOne({ user });
      if (existingVerificationRecord) {
        const s3Key = document.split(".com/")[1];
        await deleteFromS3(s3Key);
        return res.status(404).json(new ApiError(404, "Police Verification Doc already exists"));
      }

      const alreadyBadgeEarned = await CandidateBrandingBadge.findOne({
        user,
        badge: "police_verified",
      });

      if (alreadyBadgeEarned) {
        const s3Key = document.split(".com/")[1];
        await deleteFromS3(s3Key);
        return res
          .status(200)
          .json(new ApiResponse(200, alreadyBadgeEarned, "You have already earned this badge."));
      }
      const result = await policeVerificationService.create({ name, user, document });
      if (!result) {
        return res
          .status(500)
          .json(new ApiError(500, "Something went wrong while creating police verification."));
      }
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Police verification submitted successfully."));
    } catch (err) {
      next(err);
    }
  }

  static async getAllPoliceVerifications(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pipeline = [{
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
          name: 1,
          status: 1,
          remarks: 1,
          document: 1,
          createdAt: 1,
          verifiedAt: 1,
          userEmail: "$userDetails.email",
          userName: "$userDetails.fullName",
          userMobile: "$userDetails.mobile",
          profilePicUrl: "$profilePicFile.url",
        },
      }]
      const result = await policeVerificationService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPoliceVerificationById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await policeVerificationService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "police verification not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPoliceVerificationDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const result = await PoliceVerification.findOne({ user });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "police verification not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updatePoliceVerificationById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res.status(400).json(new ApiError(400, "Invalid police verification doc ID"));

      const existingVerificationRecord: any = await policeVerificationService.getById(
        verificationId
      );
      if (!existingVerificationRecord)
        return res.status(404).json(new ApiError(404, "Police Verification Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED)
        return res.status(404).json(new ApiError(404, "Police Verification already approved"));

      const { name, status, remarks, document } = req.body;
      const normalizedData = {
        name: name?.trim() || existingVerificationRecord.name,
        remarks: remarks?.trim() || existingVerificationRecord.remarks || "",
        status: status?.toLowerCase() || existingVerificationRecord.status || "pending",
        document: await extractImageUrl(document, existingVerificationRecord.document),
      };

      if (status === VerificationStatus.APPROVED) {
        const existingBadge = await CandidateBrandingBadge.findOne({
          user: existingVerificationRecord.user,
          badge: "police_verified",
        });
        if (existingBadge) {
          existingBadge.status = "active";
          existingBadge.earnedBy = "manual";
          existingBadge.assignedAt = new Date();
          await existingBadge.save();
        } else {
          await CandidateBrandingBadge.create({
            status: "active",
            earnedBy: "manual",
            assignedAt: new Date(),
            badge: "police_verified",
            user: existingVerificationRecord.user,
          });
        }
      }

      const result = await policeVerificationService.updateById(
        verificationId,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update police verification"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deletePoliceVerificationById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res.status(400).json(new ApiError(400, "Invalid police verification doc ID"));

      const existingVerificationRecord: any = await policeVerificationService.getById(
        verificationId
      );
      if (!existingVerificationRecord)
        return res.status(404).json(new ApiError(404, "Police Verification Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED) {
        return res.status(400).json(
          new ApiError(400, "Police verification is already approved and cannot be deleted or modified.")
        );
      }
      const result = await policeVerificationService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete police verification"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
