import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Job } from "../modals/job.model";
import { EnrolledPlan, PlanEnrollmentStatus } from "../modals/enrollplan.model";
import ApiError from "../utils/ApiError";

/**
 * Helper to get current month date range
 */
const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
};

/**
 * Middleware to enforce monthly job listing limits
 */
export const enforceJobListingLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: userId, role } = (req as any).user;
    const { userType: targetType } = req.body; // worker (candidate) or contractor (agency)

    // Only apply to Employers and Contractors
    if (!["employer", "contractor"].includes(role)) return next();

    // 1. Get Active Plan
    const enrolled = await EnrolledPlan.findOne({ user: userId, status: PlanEnrollmentStatus.ACTIVE })
      .populate("plan")
      .lean();

    if (!enrolled || (enrolled.expiredAt && new Date(enrolled.expiredAt) < new Date())) {
      return res.status(403).json(new ApiError(403, "Active subscription required to post jobs."));
    }

    const plan: any = enrolled.plan;

    // 2. Resolve Specific Limit based on Role and Target User Type
    let limit: number | null = plan.monthlyJobListingLimit ?? 0;

    if (role === "contractor") {
      limit = (targetType === "worker") ? plan.agencyJobPostLimits?.customer : plan.agencyJobPostLimits?.agency;
    } else if (role === "employer") {
      limit = (targetType === "worker") ? plan.employerJobPostLimits?.candidate : plan.employerJobPostLimits?.agency;
    }

    // 3. Count jobs posted this month
    const { start, end } = getMonthRange();
    const used = await Job.countDocuments({
      postedBy: userId,
      userType: targetType,
      status: { $ne: "draft" },
      createdAt: { $gte: start, $lt: end }
    });

    if (limit !== null && used >= limit) {
      return res.status(403).json(new ApiError(403, `Monthly limit reached for ${targetType} listings (${used}/${limit}).`));
    }

    // 4. Attach context
    (req as any).jobListingLimit = {
      used,
      limit,
      remaining: limit === null ? null : limit - used,
      planName: plan.displayName
    };

    next();
  } catch (error) {
    next(error);
  }
};
/**
 * Get job listing usage for a user
 */
export const getJobListingUsage = async (userId: string) => {
  // 1. Get Active Plan
  const enrolled = await EnrolledPlan.findOne({ user: userId, status: PlanEnrollmentStatus.ACTIVE })
    .populate("plan")
    .lean();

  if (!enrolled || (enrolled.expiredAt && new Date(enrolled.expiredAt) < new Date())) {
    return {
      worker: { used: 0, limit: 0, remaining: 0 },
      contractor: { used: 0, limit: 0, remaining: 0 },
      planName: "No Active Plan"
    };
  }

  const plan: any = enrolled.plan;
  const { start, end } = getMonthRange();

  // We need to know the user's role to determine limits correctly
  const { User } = require("../modals/user.model");
  const user = await User.findById(userId).select("userType");
  const role = user?.userType;

  const getUsageForType = async (targetType: string) => {
    let limit: number | null = 0;
    if (role === "contractor") {
      limit = (targetType === "worker") ? plan.agencyJobPostLimits?.customer : plan.agencyJobPostLimits?.agency;
    } else if (role === "employer") {
      limit = (targetType === "worker") ? plan.employerJobPostLimits?.candidate : plan.employerJobPostLimits?.agency;
    }

    const used = await Job.countDocuments({
      postedBy: userId,
      userType: targetType,
      status: { $ne: "draft" },
      createdAt: { $gte: start, $lt: end }
    });

    return {
      used,
      limit,
      remaining: limit === null ? null : Math.max(0, limit - used)
    };
  };

  const workerUsage = await getUsageForType("worker");
  const contractorUsage = await getUsageForType("contractor");

  return {
    worker: workerUsage,
    contractor: contractorUsage,
    planName: plan.displayName
  };
};
