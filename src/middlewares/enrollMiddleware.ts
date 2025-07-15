import mongoose from "mongoose";
import { Feature } from "../modals/feature.model";
import { Request, Response, NextFunction } from "express";
import { EnrolledPlan } from "../modals/enrollplan.model";
import { SubscriptionPlan } from "../modals/subscriptionplan.model";

/**
 * Fetches feature _id list for a given planId
 */
export const getFeatureIdsByPlanId = async (
  planId: string
): Promise<mongoose.Types.ObjectId[]> => {
  const plan = await SubscriptionPlan.findById(planId).populate("features", "_id");
  if (!plan) return [];
  return plan.features.map((f: any) => f._id);
};

/**
 * Middleware to check if the user has access to a specific feature based on their plan
 */
export const authorizeFeature =
  (requiredFeatureKey: string): any =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as any).user;
        const { role } = (req as any).user;
        if (role === "admin") return next();

        if (!user?.id) {
          return res.status(401).json({
            status: false,
            message: "Unauthorized: User information is missing in request.",
          });
        }

        // Fetch user's enrolled plan
        const enrolledPlan = await EnrolledPlan.findOne({ user: user.id, status: "active" });
        if (!enrolledPlan?.plan) {
          return res.status(403).json({
            status: false,
            message: "Access denied: No subscription plan found for the user.",
          });
        }

        // Check if the plan is expired
        const now = new Date();
        if (enrolledPlan.expiredAt && now > enrolledPlan.expiredAt) {
          return res.status(403).json({
            status: false,
            message: "Access denied: Your subscription plan has expired. Please renew to continue.",
          });
        }

        // Get feature IDs allowed under the plan
        const allowedFeatureIds = await getFeatureIdsByPlanId(enrolledPlan.plan.toString());

        // Get the feature _id based on the provided key
        const feature: any = await Feature.findOne({ key: requiredFeatureKey }).select("_id");
        if (!feature) {
          return res.status(404).json({
            status: false,
            message: `Feature with key '${requiredFeatureKey}' does not exist.`,
          });
        }

        // Check if the feature is allowed in the user's plan
        const hasAccess = allowedFeatureIds.some(
          (fId) => fId.toString() === feature._id.toString()
        );

        if (!hasAccess) {
          return res.status(403).json({
            status: false,
            message: `Access denied: Your plan does not include access to '${requiredFeatureKey}'.`,
          });
        }

        // Feature access granted
        next();
      } catch (error) {
        return res.status(500).json({
          data: error,
          status: false,
          message: "Something went wrong while verifying feature access. Please try again later.",
        });
      }
    };
