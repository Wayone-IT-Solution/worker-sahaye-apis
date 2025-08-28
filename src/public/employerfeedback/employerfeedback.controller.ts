import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { ConnectionModel } from "../../modals/connection.model";
import { EmployerFeedback } from "../../modals/employerfeedback.model";

const employerFeedbackService = new CommonService(EmployerFeedback);

export class EmployerFeedbackController {
  static async createEmployerFeedback(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { employerId } = req.body;
      const { id: user } = (req as any).user;

      // Disallow feedback to self
      if (user === employerId) {
        return res
          .status(400)
          .json(new ApiError(400, "EmployerId and UserId can't be same"));
      }

      const exists = await EmployerFeedback.findOne({
        userId: user,
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
          { requester: user, recipient: employerId },
          { requester: employerId, recipient: user },
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

      const data = { ...req.body, userId: user };
      const result = await employerFeedbackService.create(data);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create feedback"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
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
