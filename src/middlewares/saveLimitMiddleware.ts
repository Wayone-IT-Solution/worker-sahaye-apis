import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { EnrolledPlan, PlanEnrollmentStatus } from "../modals/enrollplan.model";
import { SaveItem, SaveType } from "../modals/saveitems.model";
import { SubscriptionPlan, PlanType } from "../modals/subscriptionplan.model";
import ApiError from "../utils/ApiError";

/**
 * Save Limits Configuration by Role and Plan Type
 */
const SAVE_LIMITS: {
  [key: string]: {
    [saveType: string]: { [planType: string]: number | null };
  };
} = {
  // WORKER: Can save jobs, profiles, drafts - limits by plan
  worker: {
    [SaveType.JOB]: {
      [PlanType.FREE]: 10,
      [PlanType.BASIC]: 50,
      [PlanType.PREMIUM]: 50,
      [PlanType.GROWTH]: 200,
      [PlanType.PROFESSIONAL]: 300,
      [PlanType.ENTERPRISE]: null, // unlimited
    },
    [SaveType.PROFILE]: {
      [PlanType.FREE]: 10,
      [PlanType.BASIC]: 50,
      [PlanType.PREMIUM]: 50,
      [PlanType.GROWTH]: 200,
      [PlanType.PROFESSIONAL]: 300,
      [PlanType.ENTERPRISE]: null,
    },
    [SaveType.DRAFT]: {
      [PlanType.FREE]: 10,
      [PlanType.BASIC]: 50,
      [PlanType.PREMIUM]: 50,
      [PlanType.GROWTH]: 200,
      [PlanType.PROFESSIONAL]: 300,
      [PlanType.ENTERPRISE]: null,
    },
  },

  // EMPLOYER: Can save jobs, profiles, drafts - limits by plan
  employer: {
    [SaveType.JOB]: {
      [PlanType.FREE]: 0, // Not allowed
      [PlanType.BASIC]: 100,
      [PlanType.PREMIUM]: 200,
      [PlanType.GROWTH]: 500,
      [PlanType.PROFESSIONAL]: 1000,
      [PlanType.ENTERPRISE]: null, // unlimited
    },
    [SaveType.PROFILE]: {
      [PlanType.FREE]: 0, // Not allowed
      [PlanType.BASIC]: 50,
      [PlanType.PREMIUM]: 100,
      [PlanType.GROWTH]: 300,
      [PlanType.PROFESSIONAL]: 500,
      [PlanType.ENTERPRISE]: null,
    },
    [SaveType.DRAFT]: {
      [PlanType.FREE]: 0, // Not allowed
      [PlanType.BASIC]: 50,
      [PlanType.PREMIUM]: 100,
      [PlanType.GROWTH]: 300,
      [PlanType.PROFESSIONAL]: 500,
      [PlanType.ENTERPRISE]: null,
    },
  },

  // CONTRACTOR: Similar to employer
  contractor: {
    [SaveType.JOB]: {
      [PlanType.FREE]: 0, // Not allowed
      [PlanType.BASIC]: 100,
      [PlanType.PREMIUM]: 200,
      [PlanType.GROWTH]: 500,
      [PlanType.PROFESSIONAL]: 1000,
      [PlanType.ENTERPRISE]: null,
    },
    [SaveType.PROFILE]: {
      [PlanType.FREE]: 0, // Not allowed
      [PlanType.BASIC]: 50,
      [PlanType.PREMIUM]: 100,
      [PlanType.GROWTH]: 300,
      [PlanType.PROFESSIONAL]: 500,
      [PlanType.ENTERPRISE]: null,
    },
    [SaveType.DRAFT]: {
      [PlanType.FREE]: 0, // Not allowed
      [PlanType.BASIC]: 50,
      [PlanType.PREMIUM]: 100,
      [PlanType.GROWTH]: 300,
      [PlanType.PROFESSIONAL]: 500,
      [PlanType.ENTERPRISE]: null,
    },
  },
};

/**
 * Interface for save limit context
 */
export interface SaveLimitContext {
  limit: number | null;
  used: number;
  remaining: number | null;
  plan: {
    _id: string;
    name: string;
    displayName: string;
    planType: PlanType;
  };
  isUnlimited: boolean;
}

/**
 * Get user's active plan with details
 */
const getUserActivePlan = async (
  userId: string,
): Promise<{
  planType: PlanType;
  planId: string;
  displayName: string;
  name: string;
} | null> => {
  try {
    const enrolledPlan = await EnrolledPlan.findOne({
      user: new Types.ObjectId(userId),
      status: PlanEnrollmentStatus.ACTIVE,
    })
      .populate("plan", "_id name displayName planType")
      .lean();

    if (!enrolledPlan || !enrolledPlan.plan) {
      return null;
    }

    const plan: any = enrolledPlan.plan;

    // Check if plan is expired
    if (
      enrolledPlan.expiredAt &&
      new Date(enrolledPlan.expiredAt) < new Date()
    ) {
      return null;
    }

    return {
      planType: plan.planType,
      planId: plan._id.toString(),
      displayName: plan.displayName,
      name: plan.name,
    };
  } catch (error) {
    console.error("Error fetching user active plan:", error);
    return null;
  }
};

/**
 * Get save usage context for a user by save type
 */
export const getSaveLimitContext = async (
  userId: string,
  role: string,
  saveType: SaveType,
): Promise<SaveLimitContext | null> => {
  const userPlan = await getUserActivePlan(userId);

  // If no active plan, use FREE plan limits (with default limits)
  const planType = userPlan?.planType || PlanType.FREE;

  // Get limit from configuration
  const roleKey = role.toLowerCase();
  const saveLimits = SAVE_LIMITS[roleKey];

  if (!saveLimits) {
    return null; // Unknown role
  }

  const typeLimits = saveLimits[saveType];
  if (!typeLimits) {
    return null; // Unknown save type
  }

  const limit = typeLimits[planType];

  if (limit === undefined) {
    return null; // No config for this combo
  }

  // Count current saves for this type
  const used = await (SaveItem as any).countSavesByType(userId, saveType);
  const isUnlimited = limit === null;
  const remaining = isUnlimited ? null : (limit as number) - used;

  return {
    limit: limit as number | null,
    used,
    remaining,
    plan: {
      _id: userPlan?.planId || "free",
      name: userPlan?.name || "Free Plan",
      displayName: userPlan?.displayName || "Free",
      planType,
    },
    isUnlimited,
  };
};

/**
 * Middleware to enforce save limits based on subscription plan
 */
export const enforceSaveLimit = (saveType: SaveType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, role } = (req as any).user;
      const { saveType: bodyType } = req.body;

      // Use saveType from middleware param or body
      const checkType = saveType || bodyType;

      if (!checkType) {
        return res.status(400).json(new ApiError(400, "Save type is required"));
      }

      // Get limit context
      const context = await getSaveLimitContext(userId, role, checkType);

      if (!context) {
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              `Save operation not allowed for role '${role}' on '${checkType}'`,
            ),
          );
      }

      // Check if limit exceeded
      if (
        !context.isUnlimited &&
        context.remaining !== null &&
        context.remaining <= 0
      ) {
        return res
          .status(429)
          .json(
            new ApiError(
              429,
              `Limit exceeded. You have reached the maximum of ${context.limit} ${checkType} saves. Current usage: ${context.used}/${context.limit}. Upgrade your plan to save more.`,
            ),
          );
      }

      // Attach limit context to request for logging/response
      (req as any).saveLimitContext = context;

      next();
    } catch (error) {
      console.error("Error in save limit middleware:", error);
      next(error);
    }
  };
};

/**
 * Middleware to check save limit (without specific type)
 * Expects saveType in request body
 */
export const checkSaveLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: userId, role } = (req as any).user;
    const { saveType } = req.body;

    if (!saveType) {
      return res.status(400).json(new ApiError(400, "Save type is required"));
    }

    // Get limit context
    const context = await getSaveLimitContext(userId, role, saveType);

    if (!context) {
      return res
        .status(403)
        .json(
          new ApiError(
            403,
            `Save operation not allowed for role '${role}' on '${saveType}'`,
          ),
        );
    }

    // Check if limit exceeded
    if (
      !context.isUnlimited &&
      context.remaining !== null &&
      context.remaining <= 0
    ) {
      return res
        .status(429)
        .json(
          new ApiError(
            429,
            `Limit exceeded. You have reached the maximum of ${context.limit} ${saveType} saves. Current usage: ${context.used}/${context.limit}. Upgrade your plan to save more.`,
          ),
        );
    }

    // Attach limit context to request
    (req as any).saveLimitContext = context;

    next();
  } catch (error) {
    console.error("Error in save limit middleware:", error);
    next(error);
  }
};
