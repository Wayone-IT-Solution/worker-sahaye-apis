import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import { User } from "../../modals/user.model";
import Admin from "../../modals/admin.model";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { VirtualHR } from "../../modals/virtualhr.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { extractImageUrl } from "../../admin/community/community.controller";
import { sendSingleNotification } from "../../services/notification.service";
import { VirtualHrRecruiter, VirtualHrRecruiterStatus } from "../../modals/virtualhrecruiter.model";

const virtualHrRecruiterService = new CommonService(VirtualHrRecruiter);

export class VirtualHrRecruiterController {
  static async createVirtualHrRecruiter(
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
              "Only employers or contractors can create Virtual HR Recruiter requests."
            )
          );
      }

      // ✅ Prevent duplicate active Virtual HR Recruiter requests
      const existing = await VirtualHrRecruiter.findOne({
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
            "You already have an active Virtual HR Recruiter request."
          )
        );
      }

      // ✅ Create new Virtual HR Recruiter request
      const result = await virtualHrRecruiterService.create({
        ...req.body, userId, jobDescriptionUrl
      });

      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Virtual HR Recruiter request"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Virtual HR Recruiter request created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllVirtualHrRecruiters(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const pipeline: any[] = [
        {
          $lookup: {
            from: "admins",
            localField: "assignedTo",
            foreignField: "_id",
            as: "assignedToDetails",
          },
        },
        {
          $unwind: {
            path: "$assignedToDetails",
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
            "assignedToDetails.__v": 0,
            "assignedToDetails.createdAt": 0,
            "assignedToDetails.updatedAt": 0,
            "assignedToDetails.password": 0,
          },
        },
      ];

      const filters = { ...req.query, ...(role === "admin" ? {} : { userId }) };
      const result = await virtualHrRecruiterService.getAll(filters, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getVirtualHrRecruiterById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await virtualHrRecruiterService.getById(req.params.id, true);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Virtual HR Recruiter request not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateVirtualHrRecruiterById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const document = req?.body?.jobDescriptionUrl?.[0]?.url;

      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json(new ApiError(400, "Invalid Virtual HR Recruiter ID"));

      const record = await virtualHrRecruiterService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Virtual HR Recruiter request not found."));
      }

      // ✅ Only allow update if status is PENDING, IN_PROGRESS, or ASSIGNED
      const allowedStatuses = ["Pending", "In Progress", "Assigned"];
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
      const result = await virtualHrRecruiterService.updateById(id, { ...req.body, jobDescriptionUrl: jobDescriptionUrl || document });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to update Virtual HR Recruiter request."));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Virtual HR Recruiter request updated successfully."));
    } catch (err) {
      next(err);
    }
  }

  static async deleteVirtualHrRecruiterById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await virtualHrRecruiterService.getById(id);

      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Virtual HR Recruiter request not found."));
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

      const result = await virtualHrRecruiterService.deleteById(id);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Virtual HR Recruiter request deleted successfully."));
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
          .json(new ApiError(400, "Invalid request or employee user ID."));
      }

      const request = await VirtualHrRecruiter.findById(requestId);
      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "Virtual HR Recruiter request not found."));
      }

      // ✅ Allow only certain statuses for assignment/reassignment
      if (!["Pending", "Assigned", "In Progress", "Cancelled", "Completed"].includes(request.status)) {
        return res.status(400).json(
          new ApiError(
            400,
            `Cannot assign request with status '${request.status}'.`
          )
        );
      }

      // ✅ Verify that the employee (admin user) exists
      const employeeUser = await Admin.findById(salesPersonTo);
      if (!employeeUser) {
        return res
          .status(404)
          .json(new ApiError(404, "Employee user not found."));
      }

      // ✅ Send notification to original request creator
      if (!request.assignedTo && role === "admin") {
        const userDetails = await User.findById(request.userId);
        if (userDetails && employeeUser) {
          await sendSingleNotification({
            type: "task-assigned-to-sales",
            context: {
              taskTitle: "Virtual HR Recruiter Request",
              assigneeName: employeeUser?.username || employeeUser?.email || "Employee"
            },
            toRole: userDetails.userType,
            toUserId: (userDetails?._id as any),
            fromUser: { id: adminId, role: role },
          });
        }
      }

      // ✅ Assign to employee (admin user with support/sales/manager/operation head role)
      request.assignedTo = salesPersonTo;
      request.assignedBy = adminId;
      request.assignedAt = new Date();
      request.status = VirtualHrRecruiterStatus.ASSIGNED;

      await request.save();
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            request,
            `Request assigned successfully to admin.`
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
        (!mongoose.Types.ObjectId.isValid(assignedTo) && status !== VirtualHrRecruiterStatus.CANCELLED)
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid request or Virtual HR Recruiter ID."));
      }

      const request = await VirtualHrRecruiter.findById(requestId);
      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "Virtual HR Recruiter request not found."));
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
            new ApiError(409, "This request is already assigned to a Virtual HR Recruiter.")
          );
      }

      if (status === VirtualHrRecruiterStatus.ASSIGNED && role === "admin") {
        const userDetails = await User.findById(request.userId);
        const hrDetails = await VirtualHR.findById({ _id: assignedTo });
        if (userDetails && hrDetails) {
          await sendSingleNotification({
            type: "task-status-update",
            context: {
              status: status,
              assigneeName: hrDetails?.name,
              taskTitle: request.companyName + " (Virtual HR Recruiter)",
            },
            toRole: userDetails.userType,
            toUserId: (request.userId as any),
            fromUser: { id: adminId, role: role },
          });
        }
      }
      request.status = status;
      request.assignedBy = adminId;
      request.assignedAt = new Date();
      request.assignedTo = assignedTo;
      request.cancellationReason = status === VirtualHrRecruiterStatus.CANCELLED ? note : "";

      await request.save();
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            request,
            `Request assigned successfully to Virtual HR Recruiter.`
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

      const request = await VirtualHrRecruiter.findById(requestId);
      if (!request)
        return res.status(404).json(new ApiError(404, "Virtual HR Recruiter request not found."));

      const currentStatus = request.status;

      if (status === VirtualHrRecruiterStatus.IN_PROGRESS) {
        if (currentStatus !== VirtualHrRecruiterStatus.ASSIGNED) {
          return res.status(400).json(new ApiError(400, "Request must be assigned before starting progress."));
        }
        request.status = VirtualHrRecruiterStatus.IN_PROGRESS;
      } else if (status === VirtualHrRecruiterStatus.COMPLETED) {
        if (currentStatus !== VirtualHrRecruiterStatus.IN_PROGRESS) {
          return res.status(400).json(new ApiError(400, "Request must be in progress to complete."));
        }
        request.status = VirtualHrRecruiterStatus.COMPLETED;
        request.completedAt = new Date();
      } else {
        return res.status(400).json(new ApiError(400, "Invalid status update."));
      }

      await request.save();
      // Send notification to user
      const user = await User.findById(request.userId);
      const hrDetails = await VirtualHR.findById({ _id: request.assignedTo });
      if (user && hrDetails) {
        await sendSingleNotification({
          type: "task-status-update",
          context: {
            status: status,
            assigneeName: hrDetails?.name,
            taskTitle: request.companyName + " (Virtual HR Recruiter)",
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
