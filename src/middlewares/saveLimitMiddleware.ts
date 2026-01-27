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
    const { id: userId } = (req as any).user;
    const { type } = req.body;

    if (!type || !Object.values(SaveItemType).includes(type)) {
      return res.status(400).json(new ApiError(400, "Valid Save type is required"));
    }

    // Plan-based save limits are currently disabled/commented out in the model.
    // They may be re-enabled in the future. For now, we bypass the checks.

    /*
    const enrolled = await EnrolledPlan.findOne({ user: userId, status: PlanEnrollmentStatus.ACTIVE })
      .populate("plan")
      .lean();
    ...
    */

    // Attach a dummy context for compatibility if any later code expects it
    (req as any).saveLimitContext = {
      used: await SaveItem.countDocuments({ user: userId, type }),
      limit: null,
      remaining: null,
      planName: "Unlimited (Limits Disabled)"
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
