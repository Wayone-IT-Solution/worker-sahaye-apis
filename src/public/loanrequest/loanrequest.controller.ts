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
import { UserType } from "../../modals/notification.model";
import { sendDualNotification, sendSingleNotification } from "../../services/notification.service";
import Admin from "../../modals/admin.model";
import Role from "../../modals/role.model";

const loanRequestService = new CommonService(LoanRequestModel);

const LOAN_SUPPORT_ROLE_NAMES = ["loan-support", "loan_support", "loansupport"];

const normalizeRole = (role: unknown) =>
  String(role || "")
    .trim()
    .toLowerCase();

const isLoanSupportRole = (role: unknown) =>
  LOAN_SUPPORT_ROLE_NAMES.includes(normalizeRole(role));

const getLoanSupportAdminIds = async (): Promise<mongoose.Types.ObjectId[]> => {
  const roleDoc = await Role.findOne({
    name: { $in: LOAN_SUPPORT_ROLE_NAMES },
  })
    .select("_id")
    .lean();

  if (!roleDoc?._id) return [];

  const loanSupportAdmins = await Admin.find({
    role: roleDoc._id,
    status: true,
  })
    .select("_id")
    .lean();

  return loanSupportAdmins.map((admin: any) => admin._id);
};

const getLeastLoadedLoanSupportAdminId = async () => {
  const adminIds = await getLoanSupportAdminIds();
  if (!adminIds.length) return null;

  const loadStats = await LoanRequestModel.aggregate([
    {
      $match: {
        assignedTo: { $in: adminIds },
        status: { $in: [LoanRequestStatus.ASSIGNED, LoanRequestStatus.IN_PROGRESS] },
      },
    },
    {
      $group: {
        _id: "$assignedTo",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map<string, number>();
  loadStats.forEach((item: any) => {
    countMap.set(String(item._id), Number(item.count || 0));
  });

  let selected: mongoose.Types.ObjectId | null = null;
  let selectedCount = Number.POSITIVE_INFINITY;

  adminIds.forEach((adminId) => {
    const c = countMap.get(String(adminId)) ?? 0;
    if (c < selectedCount) {
      selected = adminId;
      selectedCount = c;
    }
  });

  return selected;
};

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

    const autoAssignedTo = await getLeastLoadedLoanSupportAdminId();
    const initialStatus = autoAssignedTo
      ? LoanRequestStatus.ASSIGNED
      : LoanRequestStatus.PENDING;

    const loan = await loanRequestService.create({
      ...req.body,
      userId: user,
      status: initialStatus,
      assignedAt: autoAssignedTo ? new Date() : undefined,
      assignedTo: autoAssignedTo || undefined,
      actions: [
        {
          action: "request_created",
          status: initialStatus,
          message: autoAssignedTo
            ? "Loan request created and auto-assigned to loan-support employee."
            : "Loan request created.",
          timestamp: new Date(),
          performedByRole: "system",
        },
      ],
    });
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
    const { id: adminId, role } = (req as any).user || {};
    const roleName = normalizeRole(role);
    const isAdminRole = roleName === "admin";
    const isLoanSupport = isLoanSupportRole(roleName);

    if (!isAdminRole && !isLoanSupport) {
      return res.status(403).json(new ApiError(403, "Unauthorized access."));
    }

    const matchStage: any = {};
    if (isLoanSupport) {
      if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(401).json(new ApiError(401, "Unauthorized"));
      }
      matchStage.assignedTo = new mongoose.Types.ObjectId(adminId);
    }

    const pipeline = [
      ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
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
          from: "admins",
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
          from: "roles",
          localField: "assignedTo.role",
          foreignField: "_id",
          as: "assignedToRole",
        },
      },
      {
        $unwind: {
          path: "$assignedToRole",
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
          actions: 1,
          currentSalary: 1,
          "assignedTo.username": 1,
          "assignedTo.email": 1,
          "assignedToRole.name": 1,
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
      const hrDetails = await Admin.findById(assignedTo).select("username email");
      if (userDetails && hrDetails) {
        await sendSingleNotification({
          type: "task-status-update",
          toRole: userDetails.userType,
          toUserId: (request.userId as any),
          fromUser: { id: adminId, role: role },
          context: {
            status: status,
            taskTitle: "Loan Services",
            assigneeName: hrDetails?.username,
          },
        });
      }
    }
    request.status = status;
    request.assignedBy = adminId;
    request.assignedAt = new Date();
    request.assignedTo = assignedTo;
    request.cancellationReason = status === LoanRequestStatus.CANCELLED ? note : "";
    request.actions = [
      ...(request.actions || []),
      {
        action: status === LoanRequestStatus.CANCELLED ? "request_cancelled" : "request_assigned",
        status,
        message:
          note ||
          (status === LoanRequestStatus.CANCELLED
            ? "Loan request cancelled."
            : "Loan request assigned to loan-support employee."),
        timestamp: new Date(),
        performedBy: adminId,
        performedByRole: normalizeRole(role),
      },
    ];

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
    const { status, message } = req.body;
    const requestId = req.params.id;
    const { id: updaterId, role } = (req as any).user;

    const request = await LoanRequestModel.findById(requestId);
    if (!request)
      return res.status(404).json(new ApiError(404, "Loan Request not found."));

    const roleName = normalizeRole(role);
    if (roleName !== "admin") {
      if (!isLoanSupportRole(roleName)) {
        return res.status(403).json(new ApiError(403, "Unauthorized to update status."));
      }
      if (!request.assignedTo || String(request.assignedTo) !== String(updaterId)) {
        return res
          .status(403)
          .json(new ApiError(403, "You can only update status for requests assigned to you."));
      }
    }

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

    request.actions = [
      ...(request.actions || []),
      {
        action: "status_updated",
        status,
        message: String(message || "").trim() || `Status updated to ${status}`,
        timestamp: new Date(),
        performedBy: updaterId,
        performedByRole: roleName,
      },
    ];

    await request.save();
    // Send notification to user
    const user = await User.findById(request.userId);
    const hrDetails = await Admin.findById({ _id: request.assignedTo }).select("username");
    if (user && hrDetails) {
      await sendSingleNotification({
        type: "task-status-update",
        context: {
          status: status,
          taskTitle: "Loan Request",
          assigneeName: hrDetails?.username,
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
    loanRequest.actions = [
      ...(loanRequest.actions || []),
      {
        action: "comment_added",
        message: comment,
        timestamp: new Date(),
        performedBy: adminId,
        performedByRole: normalizeRole((req as any)?.user?.role),
      },
    ];
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
      .populate("actions.performedBy", "username email")
      .lean();

    if (!loanRequest)
      return res.status(404).json(new ApiError(404, "Loan Request not found"));
    loanRequest.history = (loanRequest.history || []).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            comments: loanRequest.history,
            actions: (loanRequest as any).actions || [],
          },
          "Loan Request history fetched"
        )
      );
  } catch (err) {
    next(err);
  }
}
