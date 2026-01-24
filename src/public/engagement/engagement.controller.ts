import ApiError from "../../utils/ApiError";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import {
  Engagement,
  EngagementType,
  RecipientType,
} from "../../modals/engagement.model";
import { Request, Response, NextFunction } from "express";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { sendDualNotification } from "../../services/notification.service";
import { isAlreadyEngaged } from "../../middlewares/engagementLimitMiddleware";

export const EngagementController = {
  async sendEngagement(req: Request, res: Response, next: NextFunction) {
    try {
      const initiatorId = (req as any).user.id;
      const { recipientId, engagementType, message, context } = req.body;

      if (initiatorId === recipientId) {
        return res
          .status(400)
          .json(new ApiError(400, "Cannot engage with yourself"));
      }

      // Validate engagement type
      if (!Object.values(EngagementType).includes(engagementType)) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid engagement type"));
      }

      // Fetch recipient to get their type
      const recipientUser = await User.findById(recipientId)
        .select("userType")
        .lean();
      if (!recipientUser) {
        return res
          .status(404)
          .json(new ApiError(404, "Recipient user not found"));
      }

      const recipientType = recipientUser.userType as unknown as RecipientType;

      // Check if already engaged
      const alreadyEngaged = await isAlreadyEngaged(
        initiatorId,
        recipientId,
        engagementType,
      );
      if (alreadyEngaged) {
        const existing = await Engagement.findOne({
          initiator: initiatorId,
          recipient: recipientId,
          engagementType,
        });
        return res
          .status(200)
          .json(new ApiResponse(200, existing, "Engagement already exists"));
      }

      const engagement = await Engagement.create({
        initiator: initiatorId,
        recipient: recipientId,
        recipientType,
        engagementType,
        message,
        context,
      });

      const [senderDoc, receiverDoc] = await Promise.all([
        User.findById(initiatorId).select("fullName userType").lean(),
        User.findById(recipientId).select("fullName userType").lean(),
      ]);

      if (senderDoc && receiverDoc) {
        await sendDualNotification({
          type: `engagement-${engagementType}`,
          context: {
            userName: senderDoc.fullName,
            prospectName: receiverDoc.fullName,
          },
          senderId: initiatorId,
          receiverId: recipientId,
          senderRole: senderDoc.userType,
          receiverRole: receiverDoc.userType,
        });
      }

      // Get context from middleware for response
      const limitContext = (req as any).engagementLimitContext;

      return res.status(201).json(
        new ApiResponse(
          201,
          {
            engagement,
            usage: limitContext
              ? {
                used: limitContext.used + 1,
                limit: limitContext.limit,
                remaining: limitContext.remaining === null ? null : Math.max(0, limitContext.remaining - 1),
                planName: limitContext.planName,
              }
              : undefined,
          },
          "Engagement created successfully",
        ),
      );
    } catch (err) {
      next(err);
    }
  },

  async getReceivedEngagements(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = (req as any).user.id;
      const { engagementType } = req.query;

      const query: any = { recipient: userId };
      if (engagementType) {
        query.engagementType = engagementType;
      }

      const engagements = await Engagement.find(query)
        .populate("initiator", "fullName userType email")
        .sort({ createdAt: -1 });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            engagements,
            "Received engagements fetched successfully",
          ),
        );
    } catch (err) {
      next(err);
    }
  },

  async getSentEngagements(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { engagementType } = req.query;

      const query: any = { initiator: userId };
      if (engagementType) {
        query.engagementType = engagementType;
      }

      const engagements = await Engagement.find(query)
        .populate("recipient", "fullName userType email")
        .sort({ createdAt: -1 });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            engagements,
            "Sent engagements fetched successfully",
          ),
        );
    } catch (err) {
      next(err);
    }
  },

  async deleteEngagement(req: Request, res: Response, next: NextFunction) {
    try {
      const { engagementId } = req.params;
      const userId = (req as any).user.id;

      const engagement = await Engagement.findOneAndDelete({
        _id: engagementId,
        $or: [{ initiator: userId }, { recipient: userId }],
      });

      if (!engagement)
        return res.status(404).json(new ApiError(404, "Engagement not found"));

      return res
        .status(200)
        .json(
          new ApiResponse(200, engagement, "Engagement deleted successfully"),
        );
    } catch (err) {
      next(err);
    }
  },

  // Backward compatibility for invite endpoints
  async sendInvite(req: Request, res: Response, next: NextFunction) {
    req.body.engagementType = EngagementType.INVITE;
    req.body.recipientId = req.body.inviteeId;
    return EngagementController.sendEngagement(req, res, next);
  },

  async getReceivedInvites(req: Request, res: Response, next: NextFunction) {
    req.query.engagementType = EngagementType.INVITE;
    return EngagementController.getReceivedEngagements(req, res, next);
  },

  async getSentInvites(req: Request, res: Response, next: NextFunction) {
    req.query.engagementType = EngagementType.INVITE;
    return EngagementController.getSentEngagements(req, res, next);
  },

  async deleteInvite(req: Request, res: Response, next: NextFunction) {
    return EngagementController.deleteEngagement(req, res, next);
  },
};

// Backward compatibility
export const InviteController = EngagementController;
