import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { UnifiedRequestStatus, UnifiedServiceRequest } from "../../modals/unifiedrequest.model";
import { extractImageUrl } from "../../admin/community/community.controller";
import { sendSingleNotification } from "../../services/notification.service";
import { User } from "../../modals/user.model";
import { VirtualHR } from "../../modals/virtualhr.model";

const unifiedRequestService = new CommonService(UnifiedServiceRequest);

export class UnifiedRequestController {
  static async createUnifiedRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const jobDescriptionUrl = req?.body?.document?.[0]?.url;

      // ✅ Only "employer" or "contractor" allowed
      if (!["employer", "contractor"].includes(role?.toLowerCase())) {
        const s3Key = jobDescriptionUrl.split(".com/")[1];
        await deleteFromS3(s3Key);
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              "Only employers or contractors can create Unified service request."
            )
          );
      }

      // ✅ Prevent duplicate active Unified service request
      const existing = await UnifiedServiceRequest.findOne({
        userId,
        isActive: true,
        status: { $in: ["Pending", "Assigned", "In Progress"] },
      });

      if (existing) {
        if (jobDescriptionUrl) {
          const s3Key = jobDescriptionUrl.split(".com/")[1];
          await deleteFromS3(s3Key);
        }
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              existing,
              "You already have an active Unified Service Request."
            )
          );
      }

      // ✅ Create new Unified Service Request
      const result = await unifiedRequestService.create({
        ...req.body,
        userId,
        document: jobDescriptionUrl,
      });

      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Unified Service Request"));
      }

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            "Unified Service Request created successfully"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllUnifiedRequests(
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
      const result = await unifiedRequestService.getAll(filters, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getUnifiedRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await unifiedRequestService.getById(req.params.id, true);
      if (!result)
        return res.status(404).json(new ApiError(404, "bulk hiring not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateUnifiedRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const document = req?.body?.document?.[0]?.url;

      if (!mongoose.Types.ObjectId.isValid(id))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid police verification doc ID"));

      const record = await unifiedRequestService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Unified Service Request not found."));
      }

      // ✅ Only allow update if status is PENDING or IN_PROGRESS
      const allowedStatuses = ["Pending", "In Progress"];
      if (!allowedStatuses.includes(record.status)) {
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              `Cannot update request with status '${record.status
              }'. Allowed statuses: ${allowedStatuses.join(", ")}.`
            )
          );
      }

      let jobDescriptionUrl;
      if (req?.body?.document && record.document) {
        jobDescriptionUrl = await extractImageUrl(
          req?.body?.document,
          record.document as string
        );
      }
      const result = await unifiedRequestService.updateById(id, {
        ...req.body,
        document: jobDescriptionUrl || document,
      });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to update Unified Service Request."));
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Unified Service Request updated successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async deleteUnifiedRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await unifiedRequestService.getById(id);

      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Unified Service Request not found."));
      }

      // ✅ Only allow deletion if it's inactive and in cancellable state
      const allowedStatuses = ["Pending", "Cancelled"];
      if (record.isActive) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Please deactivate the request before deletion.")
          );
      }

      if (!allowedStatuses.includes(record.status)) {
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              `Cannot delete request with status '${record.status
              }'. Allowed statuses: ${allowedStatuses.join(", ")}.`
            )
          );
      }

      const result = await unifiedRequestService.deleteById(id);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Unified Service Request deleted successfully."
          )
        );
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
        (!mongoose.Types.ObjectId.isValid(assignedTo) && status !== UnifiedRequestStatus.CANCELLED)
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid request or Exclusive Service ID."));
      }

      const request = await UnifiedServiceRequest.findById(requestId);
      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "Exclusive Service Doc not found."));
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

      if (status === UnifiedRequestStatus.ASSIGNED && role === "admin") {
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
              assigneeName: hrDetails?.name,
              taskTitle: request?.companyName + " (Exclusive Services)",
            },
          });
        }
      }
      request.status = status;
      request.assignedBy = adminId;
      request.assignedAt = new Date();
      request.assignedTo = assignedTo;
      request.cancellationReason = status === UnifiedRequestStatus.CANCELLED ? note : "";

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
}
