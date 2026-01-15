import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { ConnectionModel } from "../../modals/connection.model";
import { EmployerFeedback } from "../../modals/employerfeedback.model";
import { Notification } from "../../modals/notification.model";

const employerFeedbackService = new CommonService(EmployerFeedback);

export class EmployerFeedbackController {
  static async createEmployerFeedback(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { notificationId } = req.body;
      const { id: workerId } = (req as any).user;

      // Validate notification ID is provided
      if (!notificationId) {
        return res
          .status(400)
          .json(new ApiError(400, "notificationId is required in request body"));
      }

      // Fetch notification to get sender (employer/contractor) and receiver (worker)
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res
          .status(404)
          .json(new ApiError(404, "Notification not found"));
      }

      // Verify notification type is feedback-request
      if (notification.type !== "feedback-request") {
        return res
          .status(400)
          .json(new ApiError(400, "This notification is not a feedback request"));
      }

      // Verify notification has sender info
      if (!notification.from || !notification.from.user) {
        return res
          .status(400)
          .json(new ApiError(400, "Notification does not have valid sender information"));
      }

      // Extract sender (employer/contractor) and receiver (worker) from notification
      const employerId = notification.from.user;
      const notificationWorkerId = notification.to.user;

      // Verify the worker submitting feedback is the one who received the request
      if (workerId.toString() !== notificationWorkerId.toString()) {
        return res
          .status(403)
          .json(new ApiError(403, "You are not authorized to submit feedback for this request"));
      }

      // Disallow feedback to self (extra safety check)
      if (workerId.toString() === employerId.toString()) {
        return res
          .status(400)
          .json(new ApiError(400, "Cannot submit feedback to yourself"));
      }

      // Check if feedback already exists
      const exists = await EmployerFeedback.findOne({
        userId: workerId,
        employerId,
      });
      if (exists) {
        return res
          .status(409)
          .json(
            new ApiError(409, "Feedback already submitted for this employer")
          );
      }

      // Check if a valid connection exists (in either direction)
      const hasConnection = await ConnectionModel.findOne({
        $or: [
          { requester: workerId, recipient: employerId },
          { requester: employerId, recipient: workerId },
        ],
        status: "accepted",
      });

      if (!hasConnection) {
        return res
          .status(403)
          .json(
            new ApiError(403, "No valid connection exists with this employer")
          );
      }

      // Create feedback with extracted IDs
      const data = {
        ...req.body,
        userId: workerId,
        employerId,
        notificationId, // Store notification ID for reference
      };

      const result = await employerFeedbackService.create(data);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create feedback"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Feedback submitted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllEmployerFeedbacks(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user, role } = (req as any).user;
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "users",
            localField: "employerId",
            foreignField: "_id",
            as: "employerDetails",
          },
        },
        { $unwind: "$employerDetails" },
        {
          $project: {
            _id: 1,
            status: 1,
            reason: 1,
            createdAt: 1,
            testimonial: 1,
            paymentsOnTime: 1,
            wouldRecommend: 1,
            "userDetails.email": 1,
            "userDetails.mobile": 1,
            workEnvironmentRating: 1,
            "userDetails.fullName": 1,
            "employerDetails.email": 1,
            "employerDetails.mobile": 1,
            "employerDetails.fullName": 1,
            communicationTransparencyRating: 1,
          },
        },
      ];
      const filters: Record<string, any> = { ...req.query };

      if (role === "worker") {
        filters.userId = user;
      } else if (role === "employer" || role === "contractor") {
        filters.employerId = user;
      }

      const result = await employerFeedbackService.getAll(filters, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getEmployerFeedbackById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await employerFeedbackService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "feedback not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteEmployerFeedbackById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await employerFeedbackService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete feedback"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
