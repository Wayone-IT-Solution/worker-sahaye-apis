import { Request, Response, NextFunction } from "express";
import { UserType, Notification } from "../../modals/notification.model";
import { User } from "../../modals/user.model";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { sendSingleNotification } from "../../services/notification.service";
import { asyncHandler } from "../../utils/asyncHandler";
import mongoose from "mongoose";

export class NotificationController {
  /**
   * Send feedback request notification from employer/contractor to worker
   * @param req - Request with user info and worker ID in body
   * @param res - Response object
   * @param next - Next middleware
   */
  static async sendFeedbackRequest(
    req: Request & { user?: any },
    res: Response,
    next: NextFunction
  ) {
    try {
      const { workerId } = req.body;
      const { id: senderId, role: senderRole } = req.user;

      // Validate inputs
      if (!workerId) {
        return res
          .status(400)
          .json(new ApiError(400, "Worker ID is required in request body"));
      }

      // Validate sender is either employer or contractor
      if (
        senderRole !== UserType.EMPLOYER &&
        senderRole !== UserType.CONTRACTOR
      ) {
        return res.status(403).json(
          new ApiError(
            403,
            "Only employers or contractors can send feedback requests"
          )
        );
      }

      // Validate worker ID is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(workerId)) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid worker ID format"));
      }

      // Verify worker exists
      const worker = await User.findById(workerId).select("fullName mobile userType");
      if (!worker) {
        return res.status(404).json(new ApiError(404, "Worker not found"));
      }

      // Verify worker is actually a worker
      if (worker.userType !== UserType.WORKER) {
        return res.status(400).json(
          new ApiError(400, "Specified user is not a worker")
        );
      }

      // Get sender details
      const sender = await User.findById(senderId).select("fullName");
      if (!sender) {
        return res.status(404).json(new ApiError(404, "Sender not found"));
      }

      // Send notification to worker
      await sendSingleNotification({
        type: "feedback-request",
        toUserId: workerId,
        toRole: UserType.WORKER,
        fromUser: { id: senderId, role: senderRole },
        direction: "receiver",
        context: {
          senderName: sender.fullName,
          workerName: worker.fullName,
        },
      });

      return res.status(201).json(
        new ApiResponse(
          201,
          {
            workerId,
            workerName: worker.fullName,
            senderName: sender.fullName,
            notificationType: "feedback-request",
          },
          "Feedback request notification sent successfully to worker"
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send feedback request to multiple workers
   * @param req - Request with array of worker IDs in body
   * @param res - Response object
   * @param next - Next middleware
   */
  static async sendFeedbackRequestBulk(
    req: Request & { user?: any },
    res: Response,
    next: NextFunction
  ) {
    try {
      const { workerIds } = req.body;
      const { id: senderId, role: senderRole } = req.user;

      // Validate inputs
      if (!Array.isArray(workerIds) || workerIds.length === 0) {
        return res.status(400).json(
          new ApiError(400, "Worker IDs array is required and must not be empty")
        );
      }

      // Validate sender is either employer or contractor
      if (
        senderRole !== UserType.EMPLOYER &&
        senderRole !== UserType.CONTRACTOR
      ) {
        return res.status(403).json(
          new ApiError(
            403,
            "Only employers or contractors can send feedback requests"
          )
        );
      }

      // Validate all IDs are valid MongoDB ObjectIds
      const invalidIds = workerIds.filter(
        (id: string) => !mongoose.Types.ObjectId.isValid(id)
      );
      if (invalidIds.length > 0) {
        return res.status(400).json(
          new ApiError(400, `Invalid worker ID format: ${invalidIds.join(", ")}`)
        );
      }

      // Get sender details
      const sender = await User.findById(senderId).select("fullName");
      if (!sender) {
        return res.status(404).json(new ApiError(404, "Sender not found"));
      }

      // Verify all workers exist and are workers
      const workers = await User.find({
        _id: { $in: workerIds },
        userType: UserType.WORKER,
      }).select("_id fullName userType");

      if (workers.length !== workerIds.length) {
        const foundIds = workers.map((w) => w._id.toString());
        const notFoundIds = workerIds.filter(
          (id: string) => !foundIds.includes(id)
        );
        return res.status(404).json(
          new ApiError(
            404,
            `Some workers not found or are not workers: ${notFoundIds.join(", ")}`
          )
        );
      }

      // Send notifications to all workers
      const sentNotifications = [];
      const errors = [];

      for (const worker of workers) {
        try {
          await sendSingleNotification({
            type: "feedback-request",
            toUserId: worker._id.toString(),
            toRole: UserType.WORKER,
            fromUser: { id: senderId, role: senderRole },
            direction: "receiver",
            context: {
              senderName: sender.fullName,
              workerName: worker.fullName,
            },
          });
          sentNotifications.push({
            workerId: worker._id,
            workerName: worker.fullName,
            status: "success",
          });
        } catch (err: any) {
          errors.push({
            workerId: worker._id,
            workerName: worker.fullName,
            error: err.message,
          });
        }
      }

      return res.status(201).json(
        new ApiResponse(
          201,
          {
            total: workerIds.length,
            successful: sentNotifications.length,
            failed: errors.length,
            sentNotifications,
            errors: errors.length > 0 ? errors : undefined,
          },
          `Feedback request notifications sent to ${sentNotifications.length} worker(s)`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get feedback request notifications for a worker
   * @param req - Request object
   * @param res - Response object
   * @param next - Next middleware
   */
  static async getFeedbackNotifications(
    req: Request & { user?: any },
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId } = req.user;
      const { page = 1, limit = 10, status = "unread" } = req.query;

      // Query feedback request notifications
      const skip = (Number(page) - 1) * Number(limit);
      const query: any = {
        "to.user": new mongoose.Types.ObjectId(userId),
        type: "feedback-request",
      };

      if (status && status !== "all") {
        query.status = status;
      }

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .populate("from.user", "fullName")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Notification.countDocuments(query),
      ]);

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            notifications,
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total,
              pages: Math.ceil(total / Number(limit)),
            },
          },
          "Feedback request notifications fetched successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  }
}
