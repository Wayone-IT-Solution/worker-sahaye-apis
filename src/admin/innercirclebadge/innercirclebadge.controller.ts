import { NextFunction, Request, Response } from "express";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { User } from "../../modals/user.model";
import { CommonService } from "../../services/common.services";
import { Badge } from "../../modals/badge.model";
import {
  InnerCircleBadge,
} from "../../modals/innercirclebadge.model";
import {
  InnerCircleBadgeRequest,
  InnerCircleBadgeRequestStatus,
  IInnerCircleBadgeRequest,
} from "../../modals/innercirclebadgerequest.model";

const badgeService = new CommonService(InnerCircleBadge);
const requestService = new CommonService(InnerCircleBadgeRequest);

export class InnerCircleBadgeController {
  /**
   * Create a new InnerCircleBadge (Admin only)
   */
  static async createBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, price, icon, benefits } = req.body;

      if (!name || price === undefined) {
        return res
          .status(400)
          .json(new ApiError(400, "Name and price are required"));
      }

      const result = await badgeService.create({
        name,
        description,
        price,
        icon,
        benefits,
        isActive: true,
      });

      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create badge"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Badge created successfully"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all InnerCircleBadges
   */
  static async getAllBadges(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await badgeService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Badges fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get a single badge by ID
   */
  static async getBadgeById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await badgeService.getById(id);

      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Badge not found"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Badge fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update a badge
   */
  static async updateBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await badgeService.updateById(id, req.body);

      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Badge not found or update failed"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Badge updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a badge
   */
  static async deleteBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await badgeService.deleteById(id);

      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Badge not found or delete failed"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Badge deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * User requests for Inner Circle Badge
   */
  static async requestBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      
      if (!user || !user.id) {
        return res
          .status(401)
          .json(new ApiError(401, "User not authenticated"));
      }

      const userId = user.id;

      // Fetch full user data from database
      const userFromDb = await User.findById(userId);
      
      if (!userFromDb) {
        return res
          .status(404)
          .json(new ApiError(404, "User not found"));
      }

      // Validate required user info
      const userEmail = userFromDb.email;
      const userName = userFromDb.fullName;

      if (!userEmail || !userName) {
        return res
          .status(400)
          .json(new ApiError(400, "User profile incomplete. Please update your profile with name and email."));
      }

      // Find the Inner Circle badge automatically
      const badge = await Badge.findOne({ 
        $or: [
          { name: "Inner Circle" },
          { slug: "inner_circle" }
        ]
      });

      if (!badge) {
        return res
          .status(404)
          .json(new ApiError(404, "Inner Circle Badge not found"));
      }

      const { duration, price } = req.body; // Optional fields

      // Check if request already exists (with pending status)
      const existingRequest = await InnerCircleBadgeRequest.findOne({
        userId,
        badgeId: badge._id,
        status: InnerCircleBadgeRequestStatus.PENDING,
      });

      if (existingRequest) {
        return res
          .status(400)
          .json(new ApiError(400, "You already have a pending request for Inner Circle Badge"));
      }

      const badgeRequest = await InnerCircleBadgeRequest.create({
        userId,
        badgeId: badge._id,
        price: price || undefined,
        duration: duration || undefined,
        userInfo: {
          name: userName,
          email: userEmail,
          phone: userFromDb.mobile || "",
          avatar: (userFromDb as any).profilePicUrl || "",
        },
        status: InnerCircleBadgeRequestStatus.PENDING,
      });

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            badgeRequest,
            "Request submitted successfully"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all badge requests (Admin)
   */
  static async getAllRequests(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userType = req.params.userType?.toLowerCase();
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const query: any = {};
      if (req.query.status) query.status = req.query.status;
      if (req.query.userId) query.userId = req.query.userId;

      const total = await InnerCircleBadgeRequest.countDocuments(query)
        .populate("userId");

      const requests = await InnerCircleBadgeRequest.find(query)
        .populate({
          path: "userId",
          select: "name email phone userType",
          match: userType ? { userType } : undefined,
        })
        .populate("badgeId", "name price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Filter out null userId entries (when userType didn't match)
      const filteredRequests = requests.filter(req => req.userId !== null);

      const filteredTotal = filteredRequests.length > 0 
        ? await InnerCircleBadgeRequest.countDocuments({
            ...query,
            userId: { $in: filteredRequests.map(r => r.userId) }
          })
        : 0;

      return res
        .status(200)
        .json(
          new ApiResponse(200, {
            result: filteredRequests,
            pagination: {
              totalItems: filteredTotal,
              totalPages: Math.ceil(filteredTotal / limit),
              currentPage: page,
              itemsPerPage: limit,
            },
          }, "Requests fetched successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get user's badge requests
   */
  static async getUserRequests(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = (req as any).user;
      
      if (!user || !user.id) {
        return res
          .status(401)
          .json(new ApiError(401, "User not authenticated"));
      }

      const userId = user.id;

      const requests = await InnerCircleBadgeRequest.find({ userId })
        .populate("badgeId", "name price description")
        .sort({ createdAt: -1 });

      return res
        .status(200)
        .json(
          new ApiResponse(200, requests, "User requests fetched successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get a single request by ID
   */
  static async getRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id, userType } = req.params;
      const request = await InnerCircleBadgeRequest.findById(id)
        .populate({
          path: "userId",
          select: "name email phone userType",
          match: userType ? { userType: userType.toLowerCase() } : undefined,
        })
        .populate("badgeId", "name price description");

      if (!request || !request.userId) {
        return res
          .status(404)
          .json(new ApiError(404, "Request not found"));
      }

      return res
        .status(200)
        .json(
          new ApiResponse(200, request, "Request fetched successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Approve a badge request (Admin)
   */
  static async approveBadgeRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { duration, price } = req.body; // Admin can add/modify these

      const updateData: any = {
        status: InnerCircleBadgeRequestStatus.APPROVED,
        approvedAt: new Date(),
      };

      // Admin can set/override duration if provided
      if (duration) {
        updateData.duration = duration;
      }

      // Admin can set/override price if provided
      if (price !== undefined) {
        updateData.price = price;
      }

      const request = await InnerCircleBadgeRequest.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      )
        .populate("userId", "name email phone")
        .populate("badgeId", "name price");

      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "Request not found"));
      }

      return res
        .status(200)
        .json(
          new ApiResponse(200, request, "Request approved successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reject a badge request (Admin)
   */
  static async rejectBadgeRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res
          .status(400)
          .json(new ApiError(400, "Rejection reason is required"));
      }

      const request = await InnerCircleBadgeRequest.findByIdAndUpdate(
        id,
        {
          status: InnerCircleBadgeRequestStatus.REJECTED,
          rejectedAt: new Date(),
          rejectionReason,
        },
        { new: true }
      )
        .populate("userId", "name email phone")
        .populate("badgeId", "name price");

      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "Request not found"));
      }

      return res
        .status(200)
        .json(
          new ApiResponse(200, request, "Badge request rejected successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Cancel a badge request (User)
   */
  static async cancelBadgeRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      if (!user || !user.id) {
        return res
          .status(401)
          .json(new ApiError(401, "User not authenticated"));
      }

      const userId = user.id;

      const request = await InnerCircleBadgeRequest.findOne({
        _id: id,
        userId,
      });

      if (!request) {
        return res
          .status(404)
          .json(new ApiError(404, "Request not found"));
      }

      if (request.status !== InnerCircleBadgeRequestStatus.PENDING) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Only pending requests can be cancelled"
            )
          );
      }

      request.status = InnerCircleBadgeRequestStatus.CANCELLED;
      await request.save();

      return res
        .status(200)
        .json(
          new ApiResponse(200, request, "Request cancelled successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get requests by status (Admin)
   */
  static async getRequestsByStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { status, userType } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      if (!Object.values(InnerCircleBadgeRequestStatus).includes(status as any)) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid status"));
      }

      const total = await InnerCircleBadgeRequest.countDocuments({ status })
        .populate("userId");

      const requests = await InnerCircleBadgeRequest.find({ status })
        .populate({
          path: "userId",
          select: "name email phone userType",
          match: userType ? { userType: userType.toLowerCase() } : undefined,
        })
        .populate("badgeId", "name price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Filter out null userId entries (when userType didn't match)
      const filteredRequests = requests.filter(req => req.userId !== null);

      const filteredTotal = filteredRequests.length > 0 
        ? await InnerCircleBadgeRequest.countDocuments({
            status,
            userId: { $in: filteredRequests.map(r => r.userId) }
          })
        : 0;

      return res
        .status(200)
        .json(
          new ApiResponse(200, {
            result: filteredRequests,
            pagination: {
              totalItems: filteredTotal,
              totalPages: Math.ceil(filteredTotal / limit),
              currentPage: page,
              itemsPerPage: limit,
            },
          }, "Requests fetched successfully")
        );
    } catch (err) {
      next(err);
    }
  }
}
