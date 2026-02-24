import { subDays } from "date-fns";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { LoanRequestModel, LoanRequestStatus } from "../../modals/loanrequest.model";
import {
  EnrolledPlan,
  PlanEnrollmentStatus,
} from "../../modals/enrollplan.model";
import mongoose from "mongoose";
import { User } from "../../modals/user.model";
import { VirtualHR } from "../../modals/virtualhr.model";
import { UserType } from "../../modals/notification.model";
import { sendDualNotification, sendSingleNotification } from "../../services/notification.service";

const loanRequestService = new CommonService(LoanRequestModel);

export const createLoanRequest = async (req: Request, res: Response) => {
  try {
    const { id: user } = (req as any).user;
    if (!user) return res.status(401).json(new ApiError(401, "Unauthorized"));

    const { UserSubscriptionService } = require("../../services/userSubscription.service");
    const enrollment = await UserSubscriptionService.getHighestPriorityPlan(user);

    if (!enrollment)
      return res
        .status(403)
        .json(new ApiError(403, "Please enroll in subscription first"));

    const { loanCategory } = req.body;
    if (!loanCategory)
      return res
        .status(400)
        .json(new ApiError(400, "Loan category is required"));

    // Check for existing loan request in same category within last 15 days
    const fifteenDaysAgo = subDays(new Date(), 15);
    const existingRequest = await LoanRequestModel.findOne({
      loanCategory,
      userId: user,
      createdAt: { $gte: fifteenDaysAgo },
    });

    if (existingRequest) {
      return res.status(429).json(
        new ApiError(
          429,
          `You have already submitted a loan request for "${loanCategory}" within the last 15 days. Please wait before submitting another.`
        )
      );
    }

    const loan = await loanRequestService.create({ ...req.body, userId: user });
    if (!loan) {
      return res
        .status(400)
        .json(new ApiError(400, "Failed to create loan request"));
    }
    return res
      .status(201)
      .json(new ApiResponse(201, loan, "Loan request submitted successfully"));
  } catch (error) {
    console.error("Loan request creation error:", error);
    return res.status(500).json(new ApiError(500, "Could not create loan request"));
  }
};

export const getAllLoanRequests = async (req: Request, res: Response) => {
  try {
    const { id: user } = (req as any).user;
    if (!user) return res.status(401).json(new ApiError(401, "Unauthorized"));

    const { UserSubscriptionService } = require("../../services/userSubscription.service");
    const enrollment = await UserSubscriptionService.getHighestPriorityPlan(user);
    if (!enrollment)
      return res
        .status(403)
        .json(new ApiError(403, "You must enroll in a plan to request a loan"));

    const result = await loanRequestService.getAll({ ...req.query, userId: user });
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Data fetched successfully"));
  } catch (error) {
    return res.status(500).json({ error: "Could not fetch loan requests" });
  }
};

export const getAllRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
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
          from: "fileuploads",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$refId", "$$userId"] },
                    { $eq: ["$tag", "profilePic"] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "userByProfile",
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          emailId: 1,
          createdAt: 1,
          updatedAt: 1,
          isHighRisk: 1,
          companyName: 1,
          mobileNumber: 1,
          loanNeedDate: 1,
          loanCategory: 1,
          currentSalary: 1,
          "assignedTo.name": 1,
          "assignedTo.email": 1,
          "userDetails.email": 1,
          "userDetails.mobile": 1,
          "userDetails.fullName": 1,
          estimatedLoanEligibility: 1,
          "userByProfile": { $arrayElemAt: ["$userByProfile.url", 0] },
        },
      },
    ];
    const result = await loanRequestService.getAll(req.query, pipeline);
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Data fetched successfully"));
  } catch (err) {
    next(err);
  }
}

export const assignVirtualHR = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const requestId = req.params.id;
    const { id: adminId, role } = (req as any).user;
    const { assignedTo, note, status } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(requestId) ||
      (!mongoose.Types.ObjectId.isValid(assignedTo) && status !== LoanRequestStatus.CANCELLED)
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid request or Loan Request Service ID."));
    }

    const request = await LoanRequestModel.findById(requestId);
    if (!request) {
      return res
        .status(404)
        .json(new ApiError(404, "Loan Request Service Doc not found."));
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

    if (status === LoanRequestStatus.ASSIGNED && role === "admin") {
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
            taskTitle: "Loan Services",
            assigneeName: hrDetails?.name,
          },
        });
      }
    }
    request.status = status;
    request.assignedBy = adminId;
    request.assignedAt = new Date();
    request.assignedTo = assignedTo;
    request.cancellationReason = status === LoanRequestStatus.CANCELLED ? note : "";

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

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;
    const { id: updaterId, role } = (req as any).user;

    const request = await LoanRequestModel.findById(requestId);
    if (!request)
      return res.status(404).json(new ApiError(404, "Loan Request not found."));

    const currentStatus = request.status;

    if (status === LoanRequestStatus.IN_PROGRESS) {
      if (currentStatus !== LoanRequestStatus.ASSIGNED) {
        return res.status(400).json(new ApiError(400, "Request must be assigned before starting progress."));
      }
      request.status = LoanRequestStatus.IN_PROGRESS;
    } else if (status === LoanRequestStatus.COMPLETED) {
      if (currentStatus !== LoanRequestStatus.IN_PROGRESS) {
        return res.status(400).json(new ApiError(400, "Request must be in progress to complete."));
      }
      request.status = LoanRequestStatus.COMPLETED;
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
          taskTitle: "Loan Request",
          assigneeName: hrDetails?.name,
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

export const addLoanRequestComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { comment } = req.body;
    const { id: loanRequestId } = req.params;
    const { id: adminId } = (req as any).user;

    if (!comment?.trim()) {
      return res
        .status(400)
        .json(new ApiError(400, "Comment is required"));
    }

    const loanRequest = await LoanRequestModel.findById(loanRequestId);
    if (!loanRequest)
      return res.status(404).json(new ApiError(404, "Loan Request not found"));

    // Push comment
    loanRequest.history.push({
      comment,
      commentedBy: adminId,
      timestamp: new Date(),
    });
    await loanRequest.save();

    // Send notification to job poster
    const userDoc = await User.findById(loanRequest.userId);
    if (userDoc) {
      await sendDualNotification({
        type: "loan-feedback-added",
        context: {
          comment,
          userName: userDoc?.fullName,
        },
        senderId: adminId,
        senderRole: UserType.ADMIN,
        receiverRole: userDoc.userType,
        receiverId: (userDoc._id as any),
      });
    }
    return res.status(200).json(
      new ApiResponse(200, null, "Comment added and user notified")
    );
  } catch (err) {
    next(err);
  }
}

export const getLoanRequestWithHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const loanRequestId = req.params.id;
    if (!loanRequestId)
      return res.status(400).json(new ApiError(400, "Loan Request ID is required"));

    const loanRequest = await LoanRequestModel.findById(loanRequestId)
      .populate("history.commentedBy", "username email")
      .lean();

    if (!loanRequest)
      return res.status(404).json(new ApiError(404, "Loan Request not found"));
    loanRequest.history = (loanRequest.history || []).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return res
      .status(200)
      .json(new ApiResponse(200, loanRequest.history, "Loan Request with history fetched"));
  } catch (err) {
    next(err);
  }
}