import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { JobRequirement, JobRequirementStatus } from "../../modals/jobrequirement.model";
import { extractImageUrl } from "../../admin/community/community.controller";
import { sendSingleNotification } from "../../services/notification.service";
import { VirtualHR } from "../../modals/virtualhr.model";

const jobRequirementService = new CommonService(JobRequirement);

export class JobRequirementController {
  static async createJobRequirement(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const jobDescriptionUrl = req?.body?.jobDescriptionUrl?.[0]?.url;

      // ✅ Only "employer" or "contractor" allowed
      if (!["employer", "contractor"].includes(role?.toLowerCase())) {
        const s3Key = jobDescriptionUrl.split(".com/")[1];
        await deleteFromS3(s3Key);
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              "Only employers or contractors can create Job Requirement (On Demand)s."
            )
          );
      }

      // ✅ Prevent duplicate active Job Requirement (On Demand)s
      const existing = await JobRequirement.findOne({
        userId,
        isActive: true,
        status: { $in: ["Pending", "Assigned", "In Progress"] }
      });

      if (existing) {
        if (jobDescriptionUrl) {
          const s3Key = jobDescriptionUrl.split(".com/")[1];
          await deleteFromS3(s3Key);
        }
        return res.status(200).json(
          new ApiResponse(
            200,
            existing,
            "You already have an active Job Requirement (On Demand)."
          )
        );
      }

      // ✅ Create new Job Requirement (On Demand)
      const result = await jobRequirementService.create({
        ...req.body, userId, jobDescriptionUrl
      });

      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Job Requirement (On Demand)"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Job Requirement (On Demand) created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllJobRequirements(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const pipeline: any[] = [
        {
          $lookup: {
            from: "virtualhrs",
            localField: "assignedTo",
            foreignField: "_id",
            as: "assignedTo",
          },
        },
        {
          $unwind: {
            path: "$assignedTo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            __v: 0,
            "assignedTo.__v": 0,
            "assignedTo.createdAt": 0,
            "assignedTo.updatedAt": 0,
            updatedAt: 0,
          },
        },
      ];

      const filters = { ...req.query, ...(role === "admin" ? {} : { userId }) };
      const result = await jobRequirementService.getAll(filters, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getJobRequirementById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await jobRequirementService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "bulk hiring not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateJobRequirementById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const document = req?.body?.jobDescriptionUrl?.[0]?.url;

      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json(new ApiError(400, "Invalid police verification doc ID"));

      const record = await jobRequirementService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Job Requirement (On Demand) not found."));
      }

      // ✅ Only allow update if status is PENDING or IN_PROGRESS
      const allowedStatuses = ["Pending", "In Progress"];
      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot update request with status '${record.status}'. Allowed statuses: ${allowedStatuses.join(", ")}.`
          )
        );
      }

      let jobDescriptionUrl;
      if (req?.body?.jobDescriptionUrl && record.jobDescriptionUrl) {
        jobDescriptionUrl = await extractImageUrl(req?.body?.jobDescriptionUrl, record.jobDescriptionUrl as string);
      }
      const result = await jobRequirementService.updateById(id, { ...req.body, jobDescriptionUrl: jobDescriptionUrl || document });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to update Job Requirement (On Demand)."));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Job Requirement (On Demand) updated successfully."));
    } catch (err) {
      next(err);
    }
  }

  static async deleteJobRequirementById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await jobRequirementService.getById(id);

      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Job Requirement (On Demand) not found."));
      }

      // ✅ Only allow deletion if it's inactive and in cancellable state
      const allowedStatuses = ["Pending", "Cancelled"];
      if (record.isActive) {
        return res
          .status(400)
          .json(new ApiError(400, "Please deactivate the request before deletion."));
      }

      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot delete request with status '${record.status}'. Allowed statuses: ${allowedStatuses.join(", ")}.`
          )
        );
      }

      const result = await jobRequirementService.deleteById(id);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Job Requirement (On Demand) deleted successfully."));
    } catch (err) {
      next(err);
    }
  }

  static async assignVirtualHR(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const requestId = req.params.id;
      const { id: adminId, role } = (req as any).user;
      const { assignedTo, note, status } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(requestId) ||
        (!mongoose.Types.ObjectId.isValid(assignedTo) && status !== JobRequirementStatus.CANCELLED)
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid request or On Demand Hiring ID."));
      }

      const request = await JobRequirement.findById(requestId);
      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "On Demand Hiring Doc not found."));
      }

      // ✅ Allow only certain statuses
      if (!["Pending", "In Progress", "Cancelled"].includes(request.status)) {
        return res.status(400).json(
          new ApiError(
            400,
            `Cannot assign request with status '${request.status}'.`
          )
        );
      }

      // ✅ Check if already assigned
      if (request.assignedTo) {
        return res
          .status(409)
          .json(
            new ApiError(409, "This request is already assigned to a Virtual HR.")
          );
      }

      if (status === JobRequirementStatus.ASSIGNED && role === "admin") {
        const userDetails = await User.findById(request.userId);
        const hrDetails = await VirtualHR.findById(assignedTo);
        if (userDetails && hrDetails) {
          await sendSingleNotification({
            type: "task-status-update",
            toRole: userDetails.userType,
            toUserId: (request.userId as any),
            fromUser: { id: adminId, role: role },
            context: {
              status: status,
              taskTitle: "On Demand Hiring",
              assigneeName: hrDetails?.name
            },
          });
        }
      }
      request.status = status;
      request.assignedBy = adminId;
      request.assignedAt = new Date();
      request.assignedTo = assignedTo;
      request.cancellationReason = status === JobRequirementStatus.CANCELLED ? note : "";

      await request.save();
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            request,
            `Request assigned successfully to Virtual HR.`
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const requestId = req.params.id;
      const { id: updaterId, role } = (req as any).user;

      const request = await JobRequirement.findById(requestId);
      if (!request)
        return res.status(404).json(new ApiError(404, "On Demand Hiring request not found."));

      const currentStatus = request.status;

      if (status === JobRequirementStatus.IN_PROGRESS) {
        if (currentStatus !== JobRequirementStatus.ASSIGNED) {
          return res.status(400).json(new ApiError(400, "Request must be assigned before starting progress."));
        }
        request.status = JobRequirementStatus.IN_PROGRESS;
      } else if (status === JobRequirementStatus.COMPLETED) {
        if (currentStatus !== JobRequirementStatus.IN_PROGRESS) {
          return res.status(400).json(new ApiError(400, "Request must be in progress to complete."));
        }
        request.status = JobRequirementStatus.COMPLETED;
        request.completedAt = new Date();
      } else {
        return res.status(400).json(new ApiError(400, "Invalid status update."));
      }

      await request.save();
      // Send notification to user
      const user = await User.findById(request.userId);
      const hrDetails = await VirtualHR.findById(request.assignedTo);
      if (user && hrDetails) {
        await sendSingleNotification({
          type: "task-status-update",
          context: {
            status: status,
            taskTitle: "On Demand Hiring",
            assigneeName: hrDetails?.name
          },
          toRole: user.userType,
          toUserId: (user._id as any),
          fromUser: { id: updaterId, role },
        });
      }
      return res.status(200).json(new ApiResponse(200, request, "Status updated successfully."));
    } catch (err) {
      next(err);
    }
  }
}
