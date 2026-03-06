import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Job } from "../modals/job.model";
import { EnrolledPlan, PlanEnrollmentStatus } from "../modals/enrollplan.model";
import ApiError from "../utils/ApiError";
import { UserSubscriptionService } from "../services/userSubscription.service";

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

    // 1. Get Active Plan (highest priority if multiple plans)
    const enrollment = await UserSubscriptionService.getHighestPriorityPlan(userId);

    if (!enrollment) {
      return res.status(403).json(new ApiError(403, "Active subscription required to post jobs. Please subscribe to a plan first."));
    }

    if (enrollment.expiredAt && new Date(enrollment.expiredAt) < new Date()) {
      return res.status(403).json(new ApiError(403, "Your subscription has expired. Please renew your plan to post jobs."));
    }

    const plan: any = enrollment.plan;

    // Check if plan exists
    if (!plan) {
      return res.status(403).json(new ApiError(403, "No subscription plan was found for your account. Please reach out to support for further assistance.."));
    }

    // 2. Resolve Specific Limit based on Role and Target User Type
    let limit: number | null = plan.monthlyJobListingLimit ?? 0;

    if (role === "contractor") {
      if (!plan.agencyJobPostLimits) {
        return res.status(403).json(new ApiError(403, "Job posting is not available on your current plan. Please upgrade to access this feature."));
      }
      limit = (targetType === "worker") ? plan.agencyJobPostLimits?.customer : plan.agencyJobPostLimits?.agency;
    } else if (role === "employer") {
      if (!plan.employerJobPostLimits) {
        return res.status(403).json(new ApiError(403, "Job posting is not available on your current plan. Please upgrade to access this feature."));
      }
      limit = (targetType === "worker") ? plan.employerJobPostLimits?.candidate : plan.employerJobPostLimits?.agency;
    }

    // Check if limit is 0 (not allowed)
    if (limit === 0 || limit === null && plan.monthlyJobListingLimit === 0) {
      return res.status(403).json(new ApiError(403, `Your plan does not allow posting jobs for ${targetType}s. Please upgrade your subscription.`));
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
      return res.status(403).json(new ApiError(403, `Monthly job posting limit reached for ${targetType} listings. You have used ${used} out of ${limit} allowed postings this month. Please try again next month or upgrade your plan.`));
    }

    // 4. Attach context
    (req as any).jobListingLimit = {
      used,
      limit,
      remaining: limit === null ? null : limit - used,
      planName: plan.displayName,
      planType: plan.planType
    };

    next();
  } catch (error) {
    console.error("Job Listing Limit Middleware Error:", error);
    res.status(500).json(new ApiError(500, "Error checking job posting limits. Please contact support."));
  }
};
/**
 * Get job listing usage for a user
 */
export const getJobListingUsage = async (userId: string) => {
  try {
    // 1. Get Active Plan (highest priority if multiple plans)
    const enrollment = await UserSubscriptionService.getHighestPriorityPlan(userId);

    if (!enrollment || (enrollment.expiredAt && new Date(enrollment.expiredAt) < new Date())) {
      return {
        worker: { used: 0, limit: 0, remaining: 0 },
        contractor: { used: 0, limit: 0, remaining: 0 },
        planName: "No Active Plan"
      };
    }

    const plan: any = enrollment.plan;

    // Check if plan exists
    if (!plan) {
      return {
        worker: { used: 0, limit: 0, remaining: 0 },
        contractor: { used: 0, limit: 0, remaining: 0 },
        planName: "Plan Not Found"
      };
    }

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
      planName: plan.displayName || "Unknown Plan"
    };
  } catch (error) {
    console.error("Get Job Listing Usage Error:", error);
    return {
      worker: { used: 0, limit: 0, remaining: 0 },
      contractor: { used: 0, limit: 0, remaining: 0 },
      planName: "Error Fetching Plan",
      error: "Failed to retrieve job listing usage"
    };
  }
};
