import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { VirtualHR } from "../../modals/virtualhr.model";
import { NextFunction, Request, Response } from "express";
import { Salesperson } from "../../modals/salesperson.model";
import { CommonService } from "../../services/common.services";
import { sendSingleNotification } from "../../services/notification.service";
import { BulkHiringRequest, BulkHiringStatus } from "../../modals/bulkhiring.model";

const bulkHiringService = new CommonService(BulkHiringRequest);

export class BulkHiringController {
  static async createBulkHiring(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      if (!["employer", "contractor"].includes(role?.toLowerCase())) {
        return res
          .status(403)
          .json(
            new ApiError(403, "Only employers or contractors can create bulk hiring requests.")
          );
      }
      const existing = await BulkHiringRequest.findOne({
        userId,
        isActive: true,
        status: { $in: ["Pending", "In Review", "Assigned"] },
      });

      if (existing) {
        return res.status(200).json(
          new ApiResponse(200, existing, "You already have an active bulk hiring request.")
        );
      }
      const result = await bulkHiringService.create({ ...req.body, userId });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create bulk hiring"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllBulkHirings(
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
          $lookup: {
            from: "salespeople",
            localField: "salesPersonTo",
            foreignField: "_id",
            as: "salesPersonToDetails",
          },
        },
        {
          $unwind: {
            path: "$salesPersonToDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "quotations",
            localField: "_id",
            foreignField: "requestId",
            as: "quotationMatch",
          },
        },
        {
          $addFields: {
            isQuotationExists: { $gt: [{ $size: "$quotationMatch" }, 0] },
          },
        },
        {
          $project: {
            __v: 0,
            updatedAt: 0,
            quotationMatch: 0,
            "assignedTo.__v": 0,
            "assignedTo.createdAt": 0,
            "assignedTo.updatedAt": 0,
            "salesPersonToDetails.__v": 0,
            "salesPersonToDetails.createdAt": 0,
            "salesPersonToDetails.updatedAt": 0,
          },
        },
      ];

      const filters = { ...req.query, ...(role === "admin" ? {} : { userId }) };
      const result = await bulkHiringService.getAll(filters, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getBulkHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await bulkHiringService.getById(req.params.id, true);
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

  static async updateBulkHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await bulkHiringService.getById(id);
      if (!record)
        return res
          .status(404)
          .json(new ApiError(404, "Bulk hiring request not found"));

      const allowedStatuses = ["Pending", "In Review"];
      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot update request with status '${record.status}'. Allowed only in: ${allowedStatuses.join(", ")}`
          )
        );
      }
      const result = await bulkHiringService.updateById(id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update bulk hiring"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteBulkHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await bulkHiringService.getById(id);
      if (!record)
        return res
          .status(404)
          .json(new ApiError(404, "Bulk hiring request not found"));

      const allowedStatuses = ["Pending", "Cancelled"];
      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot delete request with status '${record.status}'. Allowed only in: ${allowedStatuses.join(", ")}`
          )
        );
      }
      const result = await bulkHiringService.deleteById(id);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async assignSalesPerson(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const requestId = req.params.id;
      const { salesPersonTo } = req.body;
      const { id: adminId, role } = (req as any).user;

      if (
        !mongoose.Types.ObjectId.isValid(requestId) ||
        (!mongoose.Types.ObjectId.isValid(salesPersonTo))
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid request or Bulk Hiring ID."));
      }

      const request = await BulkHiringRequest.findById(requestId);
      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "Bulk Hiring Doc not found."));
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
      if (request.salesPersonTo) {
        return res
          .status(409)
          .json(
            new ApiError(409, "This request is already assigned to a Bulk Hiring.")
          );
      }

      if (!request.salesPersonTo && role === "admin") {
        const userDetails = await User.findById(request.userId);
        const salesperson = await Salesperson.findById(salesPersonTo);
        if (userDetails && salesperson) {
          await sendSingleNotification({
            type: "task-assigned-to-sales",
            context: {
              taskTitle: "Bulk Hiring",
              assigneeName: salesperson?.name
            },
            toRole: userDetails.userType,
            toUserId: (userDetails?._id as any),
            fromUser: { id: adminId, role: role },
          });
        }
      }
      request.salesPersonTo = salesPersonTo;
      request.salesPersonAt = new Date();

      await request.save();
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            request,
            `Request assigned successfully to Bulk Hiring.`
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
        (!mongoose.Types.ObjectId.isValid(assignedTo) && status !== BulkHiringStatus.CANCELLED)
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid request or Bulk Hiring ID."));
      }

      const request = await BulkHiringRequest.findById(requestId);
      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "Bulk Hiring Doc not found."));
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
            new ApiError(409, "This request is already assigned to a Bulk Hiring.")
          );
      }

      if (status === BulkHiringStatus.ASSIGNED && role === "admin") {
        const userDetails = await User.findById(request.userId);
        const hrDetails = await VirtualHR.findById(assignedTo);
        if (userDetails && hrDetails) {
          await sendSingleNotification({
            type: "task-status-update",
            context: {
              status: status,
              taskTitle: "Bulk Hiring",
              assigneeName: hrDetails?.name
            },
            toRole: userDetails.userType,
            toUserId: (userDetails?._id as any),
            fromUser: { id: adminId, role: role },
          });
        }
      }
      request.status = status;
      request.assignedBy = adminId;
      request.assignedAt = new Date();
      request.assignedTo = assignedTo;
      request.cancellationReason = status === BulkHiringStatus.CANCELLED ? note : "";

      await request.save();
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            request,
            `Request assigned successfully to Bulk Hiring.`
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

      const request = await BulkHiringRequest.findById(requestId);
      if (!request)
        return res.status(404).json(new ApiError(404, "Bulk Hiring request not found."));

      const currentStatus = request.status;

      if (status === BulkHiringStatus.IN_PROGRESS) {
        if (currentStatus !== BulkHiringStatus.ASSIGNED) {
          return res.status(400).json(new ApiError(400, "Request must be assigned before starting progress."));
        }
        request.status = BulkHiringStatus.IN_PROGRESS;
      } else if (status === BulkHiringStatus.COMPLETED) {
        if (currentStatus !== BulkHiringStatus.IN_PROGRESS) {
          return res.status(400).json(new ApiError(400, "Request must be in progress to complete."));
        }
        request.status = BulkHiringStatus.COMPLETED;
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
            taskTitle: "Bulk Hiring",
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
