import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { User } from "../modals/user.model";
import { Engagement, EngagementType } from "../modals/engagement.model";
import { EnrolledPlan, PlanEnrollmentStatus } from "../modals/enrollplan.model";
import { PlanType } from "../modals/subscriptionplan.model";
import ApiError from "../utils/ApiError";

/**
 * Middleware to check and enforce engagement limits (Invites, Profile Views, Contact Unlocks)
 */
export const checkEngagementLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: userId, role } = (req as any).user;
    const { recipientId, engagementType } = req.body;

    if (!recipientId || !engagementType) {
      return res
        .status(400)
        .json(new ApiError(400, "recipientId and engagementType are required"));
    }

    // 1. Get Recipient Type (to determine specific sub-limit)
    const recipient = await User.findById(recipientId)
      .select("userType")
      .lean();
    if (!recipient)
      return res.status(404).json(new ApiError(404, "Recipient not found"));
    const recipientType = recipient.userType; // worker, employer, contractor

    // 2. Get Active Plan Limits - Find first valid non-null plan enrollment
    let plan: any = null;
    
    // Get all active plan enrollments sorted by date
    const enrolledPlans = await EnrolledPlan.find({
      user: userId,
      status: PlanEnrollmentStatus.ACTIVE,
    })
      .populate("plan")
      .sort({ enrolledAt: -1 })
      .lean();

    // Find the first valid plan that hasn't expired and has plan data
    for (const enrolled of enrolledPlans) {
      if (
        enrolled &&
        enrolled.plan &&
        enrolled.expiredAt &&
        new Date(enrolled.expiredAt) > new Date()
      ) {
        plan = enrolled.plan;
        break;
      }
    }

    console.log("plan", plan);


    // 3. Resolve Limit Field (inviteSendLimit, viewProfileLimit, contactUnlockLimit)
    const limitFieldMap: Record<string, string> = {
      [EngagementType.INVITE]: "inviteSendLimit",
      [EngagementType.VIEW_PROFILE]: "viewProfileLimit",
      [EngagementType.CONTACT_UNLOCK]: "contactUnlockLimit",
      [EngagementType.SAVE_PROFILE]: "saveProfileLimit",
    };

    const limitField = limitFieldMap[engagementType];
    if (!limitField)
      return res.status(400).json(new ApiError(400, "Invalid engagement type"));

    // Extract limit (can be a number or an object like { worker: 10, employer: 5 })
    let limitValue = plan ? plan[limitField] : 0; // Default to 0 for free/no plan if not configured

    console.log("limitValue", limitValue);
    
    // Resolve role-specific limit if applicable
    if (limitValue && typeof limitValue === "object") {
      limitValue = limitValue[recipientType] ?? 0;
    }

    // Convert string limits to numbers if necessary
    if (typeof limitValue === "string") {
      limitValue = parseInt(limitValue, 10);
    }

    console.log("limitValueConverted", limitValue);

    // 4. Check Usage
    const used = await Engagement.countDocuments({
      initiator: userId,
      engagementType,
      recipientType: recipientType, // Assuming this field exists or we filter by recipient
    });

    // Only block if:
    // - limit is 0 (free plan with 0 limit)
    // - OR limit is a positive number and used >= limitValue
    if (limitValue === 0 || (limitValue > 0 && used >= limitValue)) {
      return res
        .status(429)
        .json(
          new ApiError(
            429,
            `You’ve reached the maximum allowed ${engagementType} limit for ${recipientType}s. Please upgrade your subscription plan to continue.`,
          ),
        );
    }

    // 5. Attach context for response
    (req as any).engagementLimitContext = {
      used,
      limit: limitValue,
      remaining: limitValue > 0 ? limitValue - used : null,
      planName: plan?.displayName || "Free",
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Simplified Helpers
export const isAlreadyEngaged = async (
  initiator: string,
  recipient: string,
  type: EngagementType,
) => {
  return !!(await Engagement.findOne({
    initiator,
    recipient,
    engagementType: type,
  }).lean());
};

export const checkInviteLimit = checkEngagementLimit;
