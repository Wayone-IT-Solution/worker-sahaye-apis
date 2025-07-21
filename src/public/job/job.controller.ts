import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Job, JobStatus } from "../../modals/job.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { UserPreference } from "../../modals/userpreference.model";
import { JobApplication } from "../../modals/jobapplication.model";
import mongoose from "mongoose";
import { sendDualNotification } from "../../services/notification.service";
import { UserType } from "../../modals/notification.model";
import { User } from "../../modals/user.model";

const JobService = new CommonService(Job);

export class JobController {
  static async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const data = {
        ...req.body,
        postedBy: (req as any).user.id,
      };
      const result = await JobService.create(data);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create worker category"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
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
            tags: 1,
            title: 1,
            status: 1,
            salary: 1,
            metrics: 1,
            jobType: 1,
            priority: 1,
            category: 1,
            teamSize: 1,
            location: 1,
            benefits: 1,
            workMode: 1,
            industry: 1,
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            autoRepost: 1,
            categories: 1,
            publishedAt: 1,
            description: 1,
            workSchedule: 1,
            lastBoostedAt: 1,
            qualifications: 1,
            skillsRequired: 1,
            experienceLevel: 1,
            maxApplications: 1,
            shortDescription: 1,
            applicationProcess: 1,
            applicationDeadline: 1,
            creatorEmail: "$userDetails.email",
            creatorName: "$userDetails.fullName",
            profilePicUrl: "$profilePicFile.url",
            creatorMobile: "$userDetails.mobile",
            creatorUserType: "$userDetails.userType",
          },
        },
      ];

      const result = await JobService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllUserWiseJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: user } = (req as any).user;
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
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
            tags: 1,
            title: 1,
            status: 1,
            salary: 1,
            metrics: 1,
            jobType: 1,
            priority: 1,
            category: 1,
            teamSize: 1,
            location: 1,
            benefits: 1,
            workMode: 1,
            industry: 1,
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            autoRepost: 1,
            categories: 1,
            publishedAt: 1,
            description: 1,
            workSchedule: 1,
            lastBoostedAt: 1,
            qualifications: 1,
            skillsRequired: 1,
            experienceLevel: 1,
            maxApplications: 1,
            shortDescription: 1,
            applicationProcess: 1,
            applicationDeadline: 1,
            profilePicUrl: "$profilePicFile.url",
            creatorName: "$userDetails.fullName",
          },
        },
      ];
      const result = await JobService.getAll({ ...req.query, postedBy: user }, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllSuggestedJobsByUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req as any)?.user?.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid or missing user ID.");
      }
      const [preferences, applications] = await Promise.all([
        UserPreference.findOne({ userId }),
        JobApplication.find({ applicant: userId }, { job: 1 }).lean(),
      ]);

      const appliedJobIds = applications.map((app) =>
        new mongoose.Types.ObjectId(app.job)
      );
      const matchStage: Record<string, any> = {
        _id: { $nin: appliedJobIds },
        status: "open",
      };

      // Apply filters from preferences
      if (preferences?.jobType) matchStage.jobType = preferences.jobType;
      if (preferences?.workModes) matchStage.workMode = preferences.workModes;
      if (preferences?.experienceLevel)
        matchStage.experienceLevel = preferences.experienceLevel;
      if (preferences?.jobRole)
        matchStage.category = new mongoose.Types.ObjectId(preferences.jobRole);
      if (
        Array.isArray(preferences?.preferredLocations) &&
        preferences.preferredLocations.length > 0
      ) {
        matchStage["location.city"] = {
          $in: preferences.preferredLocations.map((city) => city.toLowerCase()),
        };
      }
      if (
        preferences?.salaryExpectation?.amount &&
        preferences?.salaryExpectation?.frequency
      ) {
        matchStage["salary.min"] = {
          $gte: preferences.salaryExpectation.amount,
        };
        matchStage["salary.period"] = preferences.salaryExpectation.frequency;
      }

      // Pagination and sorting
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const sortBy: any = req.query.sortBy || "createdAt";
      const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

      const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { [sortBy]: sortOrder } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
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
            title: 1,
            status: 1,
            salary: 1,
            jobType: 1,
            priority: 1,
            category: 1,
            teamSize: 1,
            location: 1,
            benefits: 1,
            workMode: 1,
            industry: 1,
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            publishedAt: 1,
            skillsRequired: 1,
            experienceLevel: 1,
            shortDescription: 1,
            applicationDeadline: 1,
            profilePicUrl: "$profilePicFile.url",
            creatorName: "$userDetails.fullName",
          },
        },
      ];

      const jobs = await Job.aggregate(pipeline);
      const total = await Job.countDocuments(matchStage);

      return res.status(200).json(
        new ApiResponse(200, {
          result: jobs,
          pagination: {
            totalItems: total,
            currentPage: page,
            itemsPerPage: limit,
            totalPages: Math.ceil(total / limit),
          },
        }, "Suggested jobs fetched successfully")
      );
    } catch (err: any) {
      console.log("❌ Error in getAllSuggestedJobsByUser:", err);
      return next(
        err instanceof ApiError
          ? err
          : new ApiError(500, "Failed to fetch suggested jobs")
      );
    }
  }

  static async getJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
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
            tags: 1,
            title: 1,
            status: 1,
            salary: 1,
            metrics: 1,
            jobType: 1,
            priority: 1,
            category: 1,
            teamSize: 1,
            location: 1,
            benefits: 1,
            workMode: 1,
            industry: 1,
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            autoRepost: 1,
            categories: 1,
            publishedAt: 1,
            description: 1,
            workSchedule: 1,
            lastBoostedAt: 1,
            qualifications: 1,
            skillsRequired: 1,
            experienceLevel: 1,
            maxApplications: 1,
            shortDescription: 1,
            applicationProcess: 1,
            applicationDeadline: 1,
            creatorID: "$userDetails._id",
            profilePicUrl: "$profilePicFile.url",
            creatorName: "$userDetails.fullName",
          },
        },
      ];
      let result: any = await JobService.getAll(
        { ...req.query, _id: req.params.id },
        pipeline
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Worker category not found"));
      result = result?.result[0];
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JobService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update worker category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JobService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete worker category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateJobStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id, role } = (req as any).user;
      const { status } = req.body;
      if (!status)
        return res.status(400).json(new ApiError(400, "Status is required"));

      const result = await JobService.updateById(req.params.id, { status });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update job status"));

      if (result?.status !== status) {
        const [jobDoc, userDoc]: any = await Promise.all([
          Job.findById(req.params.id).select("status title postedBy"),
          User.findById(result.postedBy).select("fullName email mobile"),
        ]);
        await sendDualNotification({
          type: "job-status-update",
          context: {
            status: status,
            jobTitle: jobDoc?.title,
            userName: userDoc.fullName,
          },
          senderId: id,
          receiverId: userDoc._id,
          senderRole: UserType.ADMIN,
          receiverRole: userDoc.userType,
        });
      }
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Job status updated successfully"));
    } catch (err) {
      next(err);
    }
  }
}
