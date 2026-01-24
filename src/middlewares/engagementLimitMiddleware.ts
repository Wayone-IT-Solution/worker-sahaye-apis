import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { User, UserType } from "../modals/user.model";
import {
  Engagement,
  EngagementType,
  RecipientType,
} from "../modals/engagement.model";
import { EnrolledPlan, PlanEnrollmentStatus } from "../modals/enrollplan.model";
import { SubscriptionPlan, PlanType } from "../modals/subscriptionplan.model";
import ApiError from "../utils/ApiError";

/**
 * Interface for engagement limit context
 */
export interface EngagementLimitContext {
  initiator: {
    userId: string;
    role: string;
    plan: {
      _id: string;
      name: string;
      displayName: string;
      planType: PlanType;
    };
    limit: number | null;
    used: number;
    remaining: number | null;
    isUnlimited: boolean;
  };
}

/**
 * Map engagement type to subscription plan field
 */
const getEngagementLimitField = (
  engagementType: EngagementType,
): string | null => {
  switch (engagementType) {
    case EngagementType.INVITE:
      return "inviteSendLimit";
    case EngagementType.VIEW_PROFILE:
      return "viewProfileLimit";
    case EngagementType.CONTACT_UNLOCK:
      return "contactUnlockLimit";
    default:
      return null;
  }
};

/**
 * Count engagements by initiator and type
 */
const countEngagementsByType = async (
  userId: string,
  engagementType: EngagementType,
): Promise<number> => {
  try {
    return await Engagement.countDocuments({
      initiator: new Types.ObjectId(userId),
      engagementType,
    });
  } catch (error) {
    console.error("Error counting engagements:", error);
    return 0;
  }
};

/**
 * Get engagement limit context for initiator
 * Fetches limits from their active subscription plan based on engagement type and recipient type
 */
export const getEngagementLimitContext = async (
  initiatorId: string,
  initiatorRole: string,
  engagementType: EngagementType,
  recipientType?: RecipientType,
): Promise<EngagementLimitContext | null> => {
  try {
    // Get initiator's active plan WITH PLAN DETAILS
    const initiatorEnrolledPlan = await EnrolledPlan.findOne({
      user: new Types.ObjectId(initiatorId),
      status: PlanEnrollmentStatus.ACTIVE,
    })
      .populate(
        "plan",
        "_id name displayName planType inviteSendLimit viewProfileLimit contactUnlockLimit",
      )
      .lean();

    // Check expiry
    const initiatorPlanExpired =
      initiatorEnrolledPlan?.expiredAt &&
      new Date(initiatorEnrolledPlan.expiredAt) < new Date();

    // Get limit field name for this engagement type
    const limitField = getEngagementLimitField(engagementType);
    if (!limitField) {
      return null; // Invalid engagement type
    }

    // Get limit from subscription plan
    let initiatorLimit: number | null = 0;
    let initiatorPlanInfo: any = null;

    if (
      initiatorEnrolledPlan &&
      !initiatorPlanExpired &&
      initiatorEnrolledPlan.plan
    ) {
      const plan: any = initiatorEnrolledPlan.plan;
      let limitValue = plan[limitField];

      // If limit is an object with role-based values, extract the value for the recipient type
      if (
        limitValue &&
        typeof limitValue === "object" &&
        recipientType &&
        recipientType in limitValue
      ) {
        initiatorLimit =
          limitValue[recipientType] !== undefined
            ? limitValue[recipientType]
            : 0;
      } else if (typeof limitValue === "number") {
        // Legacy: single number limit
        initiatorLimit = limitValue;
      } else {
        initiatorLimit = 0;
      }

      initiatorPlanInfo = plan;
    }

    const initiatorPlanType = initiatorPlanInfo?.planType || PlanType.FREE;

    // Count existing engagements by initiator for this type (optionally filtered by recipient type)
    let engagementFilter: any = {
      initiator: new Types.ObjectId(initiatorId),
      engagementType,
    };
    if (recipientType) {
      engagementFilter.recipientType = recipientType;
    }
    const initiatorUsed = await Engagement.countDocuments(engagementFilter);

    const initiatorIsUnlimited = initiatorLimit === null;

    const initiatorRemaining = initiatorIsUnlimited
      ? null
      : (initiatorLimit as number) - initiatorUsed;

    return {
      initiator: {
        userId: initiatorId,
        role: initiatorRole,
        plan: {
          _id: initiatorPlanInfo?._id?.toString() || "free",
          name: initiatorPlanInfo?.name || "Free Plan",
          displayName: initiatorPlanInfo?.displayName || "Free",
          planType: initiatorPlanType,
        },
        limit: initiatorLimit as number | null,
        used: initiatorUsed,
        remaining: initiatorRemaining,
        isUnlimited: initiatorIsUnlimited,
      },
    };
  } catch (error) {
    console.error("Error getting engagement limit context:", error);
    return null;
  }
};

/**
 * Middleware to enforce engagement limits based on subscription plan
 * Checks initiator's limit based on engagement type and recipient type
 */
export const checkEngagementLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: initiatorId, role: initiatorRole } = (req as any).user;
    const { recipientId, engagementType } = req.body;

    if (!recipientId) {
      return res
        .status(400)
        .json(new ApiError(400, "Recipient ID is required"));
    }

    if (!engagementType) {
      return res
        .status(400)
        .json(new ApiError(400, "Engagement type is required"));
    }

    // Validate engagement type
    if (!Object.values(EngagementType).includes(engagementType)) {
      return res.status(400).json(new ApiError(400, "Invalid engagement type"));
    }

    // Fetch recipient to get their type
    // console.log("recipientId", recipientId);
    const recipientUser = await User.findById(recipientId)
      .select("userType")
      .lean();
    // console.log("recipientUser", recipientUser);
    if (!recipientUser) {
      return res
        .status(404)
        .json(new ApiError(404, "Recipient user not found"));
    }

    const recipientType = recipientUser.userType as unknown as RecipientType;

    // Get engagement limit context with recipient type
    const context = await getEngagementLimitContext(
      initiatorId,
      initiatorRole,
      engagementType,
      recipientType,
    );

    if (!context) {
      return res.status(400).json(new ApiError(400, "Invalid engagement type"));
    }

    // Check initiator's limit
    if (context.initiator.limit === 0) {
      return res
        .status(403)
        .json(
          new ApiError(
            403,
            `Your ${context.initiator.plan.displayName} plan does not allow ${engagementType} with ${recipientType}s`,
          ),
        );
    }

    if (
      !context.initiator.isUnlimited &&
      context.initiator.remaining !== null &&
      context.initiator.remaining <= 0
    ) {
      return res
        .status(429)
        .json(
          new ApiError(
            429,
            `Limit exceeded for ${recipientType}s. You have used ${context.initiator.used}/${context.initiator.limit}. Upgrade your plan to continue.`,
          ),
        );
    }

    // Attach context to request for logging/response
    (req as any).engagementLimitContext = context;

    next();
  } catch (error) {
    console.error("Error in engagement limit middleware:", error);
    next(error);
  }
};

/**
 * Check if already engaged
 * Returns true if user has already performed this engagement type with this recipient
 */
export const isAlreadyEngaged = async (
  initiatorId: string,
  recipientId: string,
  engagementType: EngagementType,
): Promise<boolean> => {
  try {
    const existing = await Engagement.findOne({
      initiator: new Types.ObjectId(initiatorId),
      recipient: new Types.ObjectId(recipientId),
      engagementType,
    }).lean();

    return !!existing;
  } catch (error) {
    console.error("Error checking existing engagement:", error);
    return false;
  }
};

// Backward compatibility
export const checkInviteLimit = checkEngagementLimit;
export const isAlreadyInvited = async (
  inviterId: string,
  inviteeId: string,
): Promise<boolean> => {
  return isAlreadyEngaged(inviterId, inviteeId, EngagementType.INVITE);
};
