import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { EnrolledPlan, PlanEnrollmentStatus } from "../modals/enrollplan.model";
import { SaveItem, SaveItemType } from "../modals/saveitems.model";
import { PlanType } from "../modals/subscriptionplan.model";
import ApiError from "../utils/ApiError";

// Simplified LIMITS mapping
const LIMITS: Record<string, Record<string, Record<string, number | null>>> = {
  worker: {
    [SaveItemType.JOB]: { [PlanType.FREE]: 10, [PlanType.BASIC]: 50, [PlanType.PREMIUM]: 50, [PlanType.GROWTH]: 200, [PlanType.PROFESSIONAL]: 300, [PlanType.ENTERPRISE]: null },
    [SaveItemType.PROFILE]: { [PlanType.FREE]: 10, [PlanType.BASIC]: 50, [PlanType.PREMIUM]: 50, [PlanType.GROWTH]: 200, [PlanType.PROFESSIONAL]: 300, [PlanType.ENTERPRISE]: null },
    [SaveItemType.DRAFT]: { [PlanType.FREE]: 10, [PlanType.BASIC]: 50, [PlanType.PREMIUM]: 50, [PlanType.GROWTH]: 200, [PlanType.PROFESSIONAL]: 300, [PlanType.ENTERPRISE]: null },
  },
  employer: {
    [SaveItemType.JOB]: { [PlanType.FREE]: 0, [PlanType.BASIC]: 100, [PlanType.PREMIUM]: 200, [PlanType.GROWTH]: 500, [PlanType.PROFESSIONAL]: 1000, [PlanType.ENTERPRISE]: null },
    [SaveItemType.PROFILE]: { [PlanType.FREE]: 0, [PlanType.BASIC]: 50, [PlanType.PREMIUM]: 100, [PlanType.GROWTH]: 300, [PlanType.PROFESSIONAL]: 500, [PlanType.ENTERPRISE]: null },
    [SaveItemType.DRAFT]: { [PlanType.FREE]: 0, [PlanType.BASIC]: 50, [PlanType.PREMIUM]: 100, [PlanType.GROWTH]: 300, [PlanType.PROFESSIONAL]: 500, [PlanType.ENTERPRISE]: null },
  },
  contractor: {
    [SaveItemType.JOB]: { [PlanType.FREE]: 0, [PlanType.BASIC]: 100, [PlanType.PREMIUM]: 200, [PlanType.GROWTH]: 500, [PlanType.PROFESSIONAL]: 1000, [PlanType.ENTERPRISE]: null },
    [SaveItemType.PROFILE]: { [PlanType.FREE]: 0, [PlanType.BASIC]: 50, [PlanType.PREMIUM]: 100, [PlanType.GROWTH]: 300, [PlanType.PROFESSIONAL]: 500, [PlanType.ENTERPRISE]: null },
    [SaveItemType.DRAFT]: { [PlanType.FREE]: 0, [PlanType.BASIC]: 50, [PlanType.PREMIUM]: 100, [PlanType.GROWTH]: 300, [PlanType.PROFESSIONAL]: 500, [PlanType.ENTERPRISE]: null },
  }
};

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
    const planType = (enrolled && enrolled.expiredAt && new Date(enrolled.expiredAt) > new Date())
      ? (plan?.planType || PlanType.FREE)
      : PlanType.FREE;

    // 2. Resolve Limit
    const limit = LIMITS[role.toLowerCase()]?.[type]?.[planType];
    if (limit === 0) return res.status(403).json(new ApiError(403, `Saving ${type} is not allowed on your current plan.`));
    if (limit === undefined) return res.status(403).json(new ApiError(403, "Planing/Role configuration missing."));

    // 3. Check Usage
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
