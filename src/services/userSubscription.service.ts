// ============================================================
// EXAMPLE SERVICE TO MANAGE USER SUBSCRIPTIONS
// ============================================================

import { Document, Schema } from "mongoose";
import { SubscriptionPlan } from "../modals/subscriptionplan.model";
// import { SubscriptionPlanFeatureService } from "./subscriptionPlanFeature.service";
import { calculateExpiryDate } from "../modals/subscriptionplan.model";

export class UserSubscriptionService {
    /**
     * Subscribe user to a plan
     */
    static async subscribeToPlan(userId: string, planId: string, paymentMethod: string) {
        const plan = await SubscriptionPlan.findById(planId);

        if (!plan) {
            throw new Error("Plan not found");
        }

        const expiresAt = calculateExpiryDate(new Date(), plan.billingCycle);

        // Update user subscription
        // const user = await User.findByIdAndUpdate(userId, {
        //   subscriptionPlan: {
        //     planId,
        //     subscribedAt: new Date(),
        //     expiresAt,
        //     status: "active",
        //     autoRenew: true,
        //     paymentMethod
        //   },
        //   subscriptionUsage: {
        //     employerJobApplicationsThisMonth: 0,
        //     jobPostsThisMonth: 0,
        //     // ... reset all counters
        //   }
        // }, { new: true });

        // Log to subscription history
        // await user.subscriptionHistory.push({
        //   planId,
        //   planName: plan.displayName,
        //   startDate: new Date(),
        //   endDate: expiresAt,
        //   status: "active",
        //   amount: plan.basePrice,
        //   transactionId: paymentTransactionId // from payment gateway
        // });

        return { success: true, message: "Subscription activated" };
    }

    /**
     * Upgrade/Downgrade subscription
     */
    static async changePlan(userId: string, newPlanId: string) {
        const newPlan = await SubscriptionPlan.findById(newPlanId);

        if (!newPlan) {
            throw new Error("New plan not found");
        }

        const expiresAt = calculateExpiryDate(new Date(), newPlan.billingCycle);

        // Update plan and reset usage
        // const user = await User.findByIdAndUpdate(userId, {
        //   "subscriptionPlan.planId": newPlanId,
        //   "subscriptionPlan.subscribedAt": new Date(),
        //   "subscriptionPlan.expiresAt": expiresAt,
        //   subscriptionUsage: { /* reset all */ }
        // }, { new: true });

        return { success: true, message: "Plan changed successfully" };
    }

    /**
     * Check if user has access to a feature
     */
    static async canAccessFeature(userId: string, featureName: string): Promise<boolean> {
        // const user = await User.findById(userId).populate("subscriptionPlan.planId");
        // const plan = user.subscriptionPlan.planId;

        // Example usage:
        // switch(featureName) {
        //   case "postJobs":
        //     return SubscriptionPlanFeatureService.canPostJobs(plan);
        //   case "viewCommunity":
        //     return SubscriptionPlanFeatureService.canAccessCommunity(plan);
        //   case "searchCandidates":
        //     return SubscriptionPlanFeatureService.canSearchCandidates(plan);
        //   default:
        //     return false;
        // }

        return false;
    }

    /**
     * Check if user has monthly limit available
     */
    static async canUseLimit(userId: string, limitType: string): Promise<boolean> {
        // const user = await User.findById(userId).populate("subscriptionPlan.planId");
        // const plan = user.subscriptionPlan.planId;
        // const usage = user.subscriptionUsage;

        // Check if limit is already reset this month
        // const now = new Date();
        // if (usage.employerJobViewsResetDate && usage.employerJobViewsResetDate < now) {
        //   // Reset the counter
        //   usage.employerJobViewsThisMonth = 0;
        //   usage.employerJobViewsResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        // }

        // Example:
        // switch(limitType) {
        //   case "employerJobViews": {
        //     const limit = SubscriptionPlanFeatureService.getEmployerJobViewLimit(plan);
        //     if (limit === null) return true; // Unlimited
        //     return usage.employerJobViewsThisMonth < limit;
        //   }
        //   case "applyToJobs": {
        //     const limit = SubscriptionPlanFeatureService.getApplyToJobsLimit(plan);
        //     if (limit === null) return true;
        //     return usage.employerJobApplicationsThisMonth < limit;
        //   }
        //   // ... more limits
        // }

        return false;
    }

    /**
     * Increment usage counter
     */
    static async incrementUsage(userId: string, usageType: string, amount: number = 1) {
        // Update the specific usage counter
        // await User.findByIdAndUpdate(userId, {
        //   $inc: {
        //     "subscriptionUsage.employerJobViewsThisMonth": amount
        //   }
        // });

        return { success: true, message: "Usage recorded" };
    }

    /**
     * Check if subscription is valid/active
     */
    static async isSubscriptionActive(userId: string): Promise<boolean> {
        // const user = await User.findById(userId);
        // const sub = user.subscriptionPlan;

        // return (
        //   sub.status === "active" &&
        //   sub.expiresAt > new Date()
        // );

        return false;
    }

    /**
     * Renew expired subscription
     */
    static async renewSubscription(userId: string) {
        // const user = await User.findById(userId).populate("subscriptionPlan.planId");
        // const plan = user.subscriptionPlan.planId;
        // const newExpiryDate = calculateExpiryDate(new Date(), plan.billingCycle);

        // await User.findByIdAndUpdate(userId, {
        //   "subscriptionPlan.status": "active",
        //   "subscriptionPlan.expiresAt": newExpiryDate,
        //   "subscriptionPlan.subscribedAt": new Date()
        // });

        return { success: true, message: "Subscription renewed" };
    }

    /**
     * Cancel subscription
     */
    static async cancelSubscription(userId: string, reason?: string) {
        // await User.findByIdAndUpdate(userId, {
        //   "subscriptionPlan.status": "cancelled"
        // });

        return { success: true, message: "Subscription cancelled" };
    }

    /**
     * Get subscription details
     */
    static async getSubscriptionDetails(userId: string) {
        // const user = await User.findById(userId).populate("subscriptionPlan.planId");
        // const plan = user.subscriptionPlan.planId;
        // const sub = user.subscriptionPlan;
        // const usage = user.subscriptionUsage;

        // return {
        //   planName: plan.displayName,
        //   planType: plan.planType,
        //   price: plan.basePrice,
        //   billingCycle: plan.billingCycle,
        //   subscribedAt: sub.subscribedAt,
        //   expiresAt: sub.expiresAt,
        //   status: sub.status,
        //   autoRenew: sub.autoRenew,
        //   features: SubscriptionPlanFeatureService.getFeaturesSummary(plan),
        //   usage: {
        //     jobPostsThisMonth: usage.jobPostsThisMonth,
        //     employerJobViewsThisMonth: usage.employerJobViewsThisMonth,
        //     candidateContactUnlocksThisMonth: usage.candidateContactUnlocksThisMonth,
        //     // ...
        //   }
        // };

        return {};
    }
}

export const requireFeature = (featureName: string) => {
    return async (req: any, res: any, next: any) => {
        try {
            const userId = req.user?.id;

            const hasAccess = await UserSubscriptionService.canAccessFeature(
                userId,
                featureName
            );

            if (!hasAccess) {
                return res.status(403).json({
                    status: 403,
                    message: `This feature is not available in your current plan`,
                    featureName
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const requireLimit = (limitType: string) => {
    return async (req: any, res: any, next: any) => {
        try {
            const userId = req.user?.id;

            const hasLimit = await UserSubscriptionService.canUseLimit(
                userId,
                limitType
            );

            if (!hasLimit) {
                return res.status(429).json({
                    status: 429,
                    message: `You've reached your monthly limit for this action`,
                    limitType
                });
            }

            // Record the usage
            await UserSubscriptionService.incrementUsage(userId, limitType);

            next();
        } catch (error) {
            next(error);
        }
    };
};
