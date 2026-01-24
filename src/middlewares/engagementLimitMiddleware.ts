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
export const checkEngagementLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: userId, role } = (req as any).user;
    const { recipientId, engagementType } = req.body;

    if (!recipientId || !engagementType) {
      return res.status(400).json(new ApiError(400, "recipientId and engagementType are required"));
    }

    // 1. Get Recipient Type (to determine specific sub-limit)
    const recipient = await User.findById(recipientId).select("userType").lean();
    if (!recipient) return res.status(404).json(new ApiError(404, "Recipient not found"));
    const recipientType = recipient.userType; // worker, employer, contractor

    // 2. Get Active Plan Limits
    const enrolled = await EnrolledPlan.findOne({ user: userId, status: PlanEnrollmentStatus.ACTIVE })
      .populate("plan")
      .lean();

    // Default to FREE if no active plan or expired
    const plan: any = (enrolled && enrolled.expiredAt && new Date(enrolled.expiredAt) > new Date())
      ? enrolled.plan
      : null;

    // 3. Resolve Limit Field (inviteSendLimit, viewProfileLimit, contactUnlockLimit)
    const limitFieldMap: Record<string, string> = {
      [EngagementType.INVITE]: "inviteSendLimit",
      [EngagementType.VIEW_PROFILE]: "viewProfileLimit",
      [EngagementType.CONTACT_UNLOCK]: "contactUnlockLimit",
      [EngagementType.SAVE_PROFILE]: "saveProfileLimit",
    };

    const limitField = limitFieldMap[engagementType];
    if (!limitField) return res.status(400).json(new ApiError(400, "Invalid engagement type"));

    // Extract limit (can be a number or an object like { worker: 10, employer: 5 })
    let limitValue = plan ? plan[limitField] : 0; // Default to 0 for free/no plan if not configured

    // Resolve role-specific limit if applicable
    if (limitValue && typeof limitValue === 'object') {
      limitValue = limitValue[recipientType] ?? 0;
    }

    // 4. Check Usage
    const used = await Engagement.countDocuments({
      initiator: userId,
      engagementType,
      recipientType: recipientType // Assuming this field exists or we filter by recipient
    });

    if (limitValue !== null && used >= limitValue) {
      return res.status(429).json(new ApiError(429, `Limit reached for ${engagementType} on ${recipientType}s (${used}/${limitValue}).`));
    }

    // 5. Attach context for response
    (req as any).engagementLimitContext = {
      used,
      limit: limitValue,
      remaining: limitValue === null ? null : limitValue - used,
      planName: plan?.displayName || "Free"
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Simplified Helpers
export const isAlreadyEngaged = async (initiator: string, recipient: string, type: EngagementType) => {
  return !!(await Engagement.findOne({ initiator, recipient, engagementType: type }).lean());
};

export const checkInviteLimit = checkEngagementLimit;
