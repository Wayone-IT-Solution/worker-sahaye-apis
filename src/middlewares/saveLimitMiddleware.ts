import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { EnrolledPlan, PlanEnrollmentStatus } from "../modals/enrollplan.model";
import { SaveItem, SaveItemType } from "../modals/saveitems.model";
import { PlanType } from "../modals/subscriptionplan.model";
import ApiError from "../utils/ApiError";


/**
 * Middleware to check and enforce save limits
 */
export const checkSaveLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: userId, role } = (req as any).user;
    const { type } = req.body;

    if (!type || !Object.values(SaveItemType).includes(type)) {
      return res.status(400).json(new ApiError(400, "Valid Save type is required"));
    }

    // 1. Get Active Plan
    const enrolled = await EnrolledPlan.findOne({ user: userId, status: PlanEnrollmentStatus.ACTIVE })
      .populate("plan")
      .lean();

    const plan = enrolled?.plan as any;
    const isActive = !!(enrolled && enrolled.expiredAt && new Date(enrolled.expiredAt) > new Date());

    // 2. Resolve Dynamic Limits from Plan
    let limit: number | null = null;
    let totalLimit: number | null = null;

    if (plan && isActive) {
      totalLimit = plan.totalSavesLimit ?? null;
      if (type === SaveItemType.PROFILE) limit = plan.saveProfilesLimit ?? null;
      else if (type === SaveItemType.JOB) limit = plan.saveJobsLimit ?? null;
      else if (type === SaveItemType.DRAFT) limit = plan.saveDraftsLimit ?? null;
    }

    // Default to 0 (blocked) if no active plan or limit not defined
    if (!isActive || limit === 0) {
      return res.status(403).json(new ApiError(403, `Saving ${type} is not allowed on your current plan.`));
    }

    // 3. Check Overall Usage (if total cap exists)
    if (totalLimit !== null) {
      const totalUsed = await SaveItem.countDocuments({ user: userId });
      if (totalUsed >= totalLimit) {
        return res.status(429).json(new ApiError(429, `Total monthly save limit reached (${totalUsed}/${totalLimit}).`));
      }
    }

    // 4. Check Specific Type Usage
    const used = await SaveItem.countDocuments({ user: userId, type });

    if (limit !== null && used >= limit) {
      return res.status(429).json(new ApiError(429, `Limit reached (${used}/${limit}). Upgrade your plan to save more ${type}s.`));
    }

    // 4. Attach context for response
    (req as any).saveLimitContext = {
      used,
      limit,
      remaining: limit === null ? null : limit - used,
      planName: plan?.displayName || "Free"
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Simplified version of the former enforceSaveLimit (can be used in routes with predefined types)
export const checkLimitOfType = (type: SaveItemType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    req.body.type = type;
    return checkSaveLimit(req, res, next);
  };
};
