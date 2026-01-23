import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { ComplianceChecklist, VerificationStatus } from "../../modals/compliancechecklist.model";
import { checkAndAssignBadge } from "../candidatebrandingbadge/candidatebrandingbadge.controller";
import { EnrolledPlan, PlanEnrollmentStatus } from "../../modals/enrollplan.model";
import { ISubscriptionPlan, PlanType } from "../../modals/subscriptionplan.model";

const ComplianceChecklistService = new CommonService(ComplianceChecklist);

export class ComplianceChecklistController {
  static async createComplianceChecklist(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const existingVerificationRecord: any = await ComplianceChecklist.findOne({
        user,
      });
      if (existingVerificationRecord) {
        return res
          .status(404)
          .json(new ApiError(404, "Compliance Pro Doc already exists"));
      }

      // Only users with plan types other than FREE can create compliance checklists
      const enrolled = await EnrolledPlan.findOne({ user, status: PlanEnrollmentStatus.ACTIVE }).populate<{ plan: ISubscriptionPlan }>("plan");
      const planType = (enrolled?.plan as ISubscriptionPlan | undefined)?.planType as PlanType | undefined;
      if (!enrolled || planType === PlanType.FREE) {
        return res.status(403).json(new ApiError(403, "Your subscription plan does not allow creating compliance checklists"));
      }

      const result = await ComplianceChecklistService.create({ user, ...req.body });
      if (!result) {
        return res
          .status(404)
          .json(
            new ApiError(
              404,
              "Something went wrong while creating Compliance Pro."
            )
          );
      }
      return res
        .status(201)
        .json(
          new ApiResponse(201, result, "Compliance Pro submitted successfully.")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllComplianceChecklists(
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
      const result = await ComplianceChecklistService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getComplianceChecklistById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await ComplianceChecklistService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Compliance Pro not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getComplianceChecklistDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const result = await ComplianceChecklist.findOne({ user });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Compliance Pro not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateComplianceChecklistById(
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
          .json(new ApiError(400, "Invalid Compliance Pro doc ID"));

      const existingVerificationRecord: any =
        await ComplianceChecklistService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Compliance Pro Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED)
        return res
          .status(404)
          .json(new ApiError(404, "Compliance Pro already approved"));

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
      const result = await ComplianceChecklistService.updateById(
        verificationId,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Compliance Pro"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteComplianceChecklistById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Compliance Pro doc ID"));

      const existingVerificationRecord: any =
        await ComplianceChecklistService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Compliance Pro Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Compliance Pro is already approved and cannot be deleted or modified."
            )
          );
      }
      const result = await ComplianceChecklistService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Compliance Pro"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
