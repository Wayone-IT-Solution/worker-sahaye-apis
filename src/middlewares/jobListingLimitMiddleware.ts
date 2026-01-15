import mongoose from "mongoose";
import { Role } from "./authMiddleware";
import ApiError from "../utils/ApiError";
import { Job } from "../modals/job.model";
import { NextFunction, Request, Response } from "express";
import { EnrolledPlan, PlanEnrollmentStatus } from "../modals/enrollplan.model";

type JobLimitContext = {
  limit: number | null;
  usedThisMonth: number;
  remaining: number | null;
  plan?: {
    name?: string;
    displayName?: string;
    _id: mongoose.Types.ObjectId;
  };
  expired?: boolean;
};

const getCurrentMonthWindow = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
};

const getActivePlanWithLimit = async (
  userId: string
): Promise<JobLimitContext> => {
  const enrolledPlan = await EnrolledPlan.findOne({
    user: userId,
    status: PlanEnrollmentStatus.ACTIVE,
  })
    .populate("plan", "_id name displayName monthlyJobListingLimit")
    .lean();

  if (!enrolledPlan || !enrolledPlan.plan) {
    return {
      limit: null,
      usedThisMonth: 0,
      remaining: null,
    };
  }

  const plan: any = enrolledPlan.plan;
  const limit =
    typeof plan.monthlyJobListingLimit === "number"
      ? plan.monthlyJobListingLimit
      : null;

  const expired =
    !!enrolledPlan.expiredAt && new Date(enrolledPlan.expiredAt) < new Date();

  return {
    limit,
    usedThisMonth: 0,
    remaining: limit,
    plan: {
      _id: plan._id,
      name: plan.name,
      displayName: plan.displayName,
    },
    expired,
  };
};

export const getJobListingUsage = async (
  userId: string
): Promise<JobLimitContext> => {
  const base = await getActivePlanWithLimit(userId);
  const { start, end } = getCurrentMonthWindow();

  const usedThisMonth = await Job.countDocuments({
    postedBy: new mongoose.Types.ObjectId(userId),
    createdAt: { $gte: start, $lt: end },
  });

  const remaining =
    base.limit !== null ? Math.max(base.limit - usedThisMonth, 0) : null;

  return {
    ...base,
    usedThisMonth,
    remaining,
  };
};

/**
 * Enforces monthly job listing limits for employers and contractors.
 */
export const enforceJobListingLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user } = req as any;
    if (!user?.id) {
      return res.status(401).json(new ApiError(401, "Unauthorized user"));
    }

    if (!["employer", "contractor"].includes(user.role as Role)) {
      return next();
    }

    const usage = await getJobListingUsage(user.id);

    // if (!usage.plan?._id) {
    //   return res
    //     .status(403)
    //     .json(
    //       new ApiError(
    //         403,
    //         "No active subscription plan found. Please subscribe to post jobs."
    //       )
    //     );
    // }

    if (usage.expired) {
      return res
        .status(403)
        .json(
          new ApiError(
            403,
            "Your subscription plan has expired. Please renew to continue posting jobs."
          )
        );
    }

    if (usage.limit !== null && usage.usedThisMonth >= usage.limit) {
      return res
        .status(403)
        .json(
          new ApiError(
            403,
            `Monthly job listing limit reached (${usage.limit}). Upgrade or wait until the next cycle.`
          )
        );
    }

    (req as any).jobListingLimit = usage;
    return next();
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Failed to verify job posting eligibility"));
  }
};
