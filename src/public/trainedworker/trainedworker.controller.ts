import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { Enrollment } from "../../modals/enrollment.model";
import { CommonService } from "../../services/common.services";
import { extractImageUrl } from "../../admin/community/community.controller";
import {
  TrainedWorker,
  VerificationStatus,
} from "./../../modals/trainedworker.model";
import { checkAndAssignBadge } from "../candidatebrandingbadge/candidatebrandingbadge.controller";

const TrainedWorkerService = new CommonService(TrainedWorker);

export class TrainedWorkerController {
  static async createTrainedWorker(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { courseEnrollmentId } = req.body;
      const { id: user } = (req as any).user;
      const document = req?.body?.document?.[0]?.url;

      if (!document || !courseEnrollmentId) {
        return res
          .status(400)
          .json(new ApiError(400, "Document & Enrollment ID are required."));
      }

      const enrollmentExisted = await Enrollment.findById(courseEnrollmentId);
      if (!enrollmentExisted) {
        return res
          .status(404)
          .json(new ApiError(404, "Course enrollment not found"));
      }

      if (enrollmentExisted.progress !== 100) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Course must be completed (100% progress) to proceed"
            )
          );
      }

      const existingVerificationRecord: any = await TrainedWorker.findOne({
        user,
      });
      if (existingVerificationRecord) {
        const s3Key = document.split(".com/")[1];
        await deleteFromS3(s3Key);
        return res
          .status(404)
          .json(new ApiError(404, "Trained Worker Doc already exists"));
      }
      const result = await TrainedWorkerService.create({
        user,
        document,
        courseEnrollmentId,
      });
      if (!result) {
        return res
          .status(404)
          .json(
            new ApiError(
              404,
              "Something went wrong while creating Trained Worker."
            )
          );
      }
      return res
        .status(201)
        .json(
          new ApiResponse(201, result, "Trained Worker submitted successfully.")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllTrainedWorkers(
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
            from: "enrollments",
            localField: "courseEnrollmentId",
            foreignField: "_id",
            as: "enrollDetails",
          },
        },
        { $unwind: "$enrollDetails" },
        {
          $lookup: {
            from: "courses",
            let: { courseId: "$enrollDetails.course" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$courseId"],
                  },
                },
              },
            ],
            as: "courseDetails",
          },
        },
        { $unwind: "$courseDetails" },
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
            courseId: "$courseDetails._id",
            userEmail: "$userDetails.email",
            userName: "$userDetails.fullName",
            userMobile: "$userDetails.mobile",
            courseType: "$courseDetails.type",
            courseTitle: "$courseDetails.name",
            enrollmentId: "$enrollDetails._id",
            profilePicUrl: "$profilePicFile.url",
            enrollmentStatus: "$enrollDetails.status",
            enrollmentAmount: "$enrollDetails.finalAmount",
            enrollmentPaymentDetails: "$enrollDetails.paymentDetails",
          },
        },
      ];
      const result = await TrainedWorkerService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getTrainedWorkerById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await TrainedWorkerService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Trained Worker not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getTrainedWorkerDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const result = await TrainedWorker.findOne({ user });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Trained Worker not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateTrainedWorkerById(
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
          .json(new ApiError(400, "Invalid Trained Worker doc ID"));

      const existingVerificationRecord: any =
        await TrainedWorkerService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Trained Worker Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED)
        return res
          .status(404)
          .json(new ApiError(404, "Trained Worker already approved"));

      const { courseEnrollmentId, status, slug, remarks, document } = req.body;

      const normalizedData = {
        remarks: remarks?.trim() || existingVerificationRecord.remarks || "",
        status:
          status?.toLowerCase() ||
          existingVerificationRecord.status ||
          "pending",
        document: await extractImageUrl(
          document,
          existingVerificationRecord.document
        ),
        courseEnrollmentId:
          courseEnrollmentId?.trim() ||
          existingVerificationRecord.courseEnrollmentId ||
          "",
      };

      if (status === VerificationStatus.APPROVED && role === "admin") {
        await checkAndAssignBadge(existingVerificationRecord.user, slug, {
          assignIfNotExists: true,
          user: { id, role },
        });
      }
      if (courseEnrollmentId) {
        const enrollmentExisted = await Enrollment.findById(courseEnrollmentId);
        if (!enrollmentExisted) {
          return res
            .status(404)
            .json(new ApiError(404, "Course enrollment not found"));
        }

        if (enrollmentExisted.progress !== 100) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                "Course must be completed (100% progress) to proceed"
              )
            );
        }
      }

      const result = await TrainedWorkerService.updateById(
        verificationId,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Trained Worker"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteTrainedWorkerById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const verificationId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(verificationId))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid Trained Worker doc ID"));

      const existingVerificationRecord: any =
        await TrainedWorkerService.getById(verificationId);
      if (!existingVerificationRecord)
        return res
          .status(404)
          .json(new ApiError(404, "Trained Worker Doc not found"));

      if (existingVerificationRecord?.status === VerificationStatus.APPROVED) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Trained Worker is already approved and cannot be deleted or modified."
            )
          );
      }
      const result = await TrainedWorkerService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Trained Worker"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
