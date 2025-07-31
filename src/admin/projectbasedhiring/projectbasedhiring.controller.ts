import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { sendSingleNotification } from "../../services/notification.service";
import { ProjectBasedHiring, ProjectHiringStatus } from "../../modals/projectbasedhiring.model";
import { VirtualHR } from "../../modals/virtualhr.model";
import { Salesperson } from "../../modals/salesperson.model";

const projectBasedHiringService = new CommonService(ProjectBasedHiring);

export class ProjectHiringController {
  static async createProjectHiring(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;

      // ✅ Only "employer" or "contractor" allowed
      if (!["employer", "contractor"].includes(role?.toLowerCase())) {
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              "Only employers or contractors can create project-based hiring requests."
            )
          );
      }

      // ✅ Check for existing active project-based hiring request
      const existing = await ProjectBasedHiring.findOne({
        userId,
        isActive: true,
        status: { $in: ["Open", "Assigned", "In Progress"] }, // update to match your model status
      });

      if (existing) {
        return res.status(200).json(
          new ApiResponse(
            200,
            existing,
            "You already have an active project-based hiring request."
          )
        );
      }

      // ✅ Create the new record
      const result = await projectBasedHiringService.create({
        ...req.body,
        userId,
      });

      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create project-based hiring"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllProjectHirings(
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
      const result = await projectBasedHiringService.getAll(filters, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getProjectHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await projectBasedHiringService.getById(req.params.id, true);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Project Based Hiring not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateProjectHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;

      const record = await projectBasedHiringService.getById(id);
      if (!record)
        return res
          .status(404)
          .json(new ApiError(404, "Project-based hiring request not found"));

      const allowedStatuses = ["Open", "In Progress"];
      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot update request with status '${record.status}'. Allowed only in: ${allowedStatuses.join(", ")}`
          )
        );
      }

      const result = await projectBasedHiringService.updateById(id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update project-based hiring"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteProjectHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;

      const record = await projectBasedHiringService.getById(id);
      if (!record)
        return res
          .status(404)
          .json(new ApiError(404, "Project-based hiring request not found"));

      const allowedStatuses = ["Open", "Cancelled"];
      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot delete request with status '${record.status}'. Allowed only in: ${allowedStatuses.join(", ")}`
          )
        );
      }

      const result = await projectBasedHiringService.deleteById(id);
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
          .json(new ApiError(400, "Invalid request or Project Based Hiring ID."));
      }

      const request = await ProjectBasedHiring.findById(requestId);
      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "Project Based Hiring Doc not found."));
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
            new ApiError(409, "This request is already assigned to a Project Based Hiring.")
          );
      }

      if (!request.salesPersonTo && role === "admin") {
        const userDetails = await User.findById(request.userId);
        const salesperson = await Salesperson.findById(salesPersonTo);
        if (userDetails && salesperson) {
          await sendSingleNotification({
            type: "task-assigned-to-sales",
            context: {
              taskTitle: "Project Based Hiring",
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
            `Request assigned successfully to Project Based Hiring.`
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
        (!mongoose.Types.ObjectId.isValid(assignedTo) && status !== ProjectHiringStatus.CANCELLED)
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid request or Project Based Hiring ID."));
      }

      const request = await ProjectBasedHiring.findById(requestId);
      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "Project Based Hiring Doc not found."));
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

      if (status === ProjectHiringStatus.ASSIGNED && role === "admin") {
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
              taskTitle: request?.projectTitle + " (Project Based Hiring)",
            },
          });
        }
      }
      request.status = status;
      request.assignedBy = adminId;
      request.assignedAt = new Date();
      request.assignedTo = assignedTo;
      request.cancellationReason = status === ProjectHiringStatus.CANCELLED ? note : "";

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

      const request = await ProjectBasedHiring.findById(requestId);
      if (!request)
        return res.status(404).json(new ApiError(404, "Project Based Hiring request not found."));

      const currentStatus = request.status;

      if (status === ProjectHiringStatus.IN_PROGRESS) {
        if (currentStatus !== ProjectHiringStatus.ASSIGNED) {
          return res.status(400).json(new ApiError(400, "Request must be assigned before starting progress."));
        }
        request.status = ProjectHiringStatus.IN_PROGRESS;
      } else if (status === ProjectHiringStatus.COMPLETED) {
        if (currentStatus !== ProjectHiringStatus.IN_PROGRESS) {
          return res.status(400).json(new ApiError(400, "Request must be in progress to complete."));
        }
        request.status = ProjectHiringStatus.COMPLETED;
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
            assigneeName: hrDetails?.name,
            taskTitle: request?.projectTitle + " (Project Based Hiring)",
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
