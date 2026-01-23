import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { SubscriptionPlan, PlanType, UserType, BillingCycle } from "../../modals/subscriptionplan.model";
import { SubscriptionPlanFeatureService } from "../../services/subscriptionPlanFeature.service";

const subscriptionPlanService = new CommonService(SubscriptionPlan);

// Validation function for subscription plan data
const validateSubscriptionPlanData = (data: any) => {
  const errors: string[] = [];

  if (!data.name) errors.push("Plan name is required");
  if (!data.displayName) errors.push("Display name is required");
  if (!data.description) errors.push("Description is required");
  if (data.basePrice === undefined || data.basePrice < 0) errors.push("Valid base price is required");
  if (!data.planType || !Object.values(PlanType).includes(data.planType)) errors.push("Valid plan type is required");
  if (!data.userType || !Object.values(UserType).includes(data.userType)) errors.push("Valid user type is required");
  if (!data.billingCycle || !Object.values(BillingCycle).includes(data.billingCycle)) errors.push("Valid billing cycle is required");

  return errors;
};

export class SubscriptionplanController {
  static async createSubscriptionplan(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Validate required fields
      const validationErrors = validateSubscriptionPlanData(req.body);
      if (validationErrors.length > 0) {
        return res
          .status(400)
          .json(new ApiError(400, validationErrors.join(", ")));
      }

      const result = await subscriptionPlanService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create subscription plan"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Subscription plan created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllSubscriptionplans(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Support filtering by userType, planType, status
      const query: any = {};
      if (req.query.userType) query.userType = req.query.userType;
      if (req.query.planType) query.planType = req.query.planType;
      if (req.query.status) query.status = req.query.status;
      if (req.query.billingCycle) query.billingCycle = req.query.billingCycle;
      if (req.query.isPopular) query.isPopular = req.query.isPopular === "true";
      if (req.query.isRecommended) query.isRecommended = req.query.isRecommended === "true";

      const result = await subscriptionPlanService.getAll(query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscription plans fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getSubscriptionplanById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await subscriptionPlanService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Subscription plan not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscription plan fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateSubscriptionplanById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Validate only provided fields
      const validationErrors = validateSubscriptionPlanData(req.body);
      if (validationErrors.length > 0) {
        return res
          .status(400)
          .json(new ApiError(400, validationErrors.join(", ")));
      }

      const result = await subscriptionPlanService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update subscription plan"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscription plan updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteSubscriptionplanById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await subscriptionPlanService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete subscription plan"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscription plan deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Get plans by user type
  static async getPlansByUserType(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userType } = req.params;
      if (!Object.values(UserType).includes(userType as UserType)) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid user type"));
      }

      const result = await subscriptionPlanService.getAll({
        userType,
        status: "active",
      });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Plans fetched by user type"));
    } catch (err) {
      next(err);
    }
  }

  // Get recommended plans
  static async getRecommendedPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await subscriptionPlanService.getAll({
        isRecommended: true,
        status: "active",
      });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Recommended plans fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Get popular plans
  static async getPopularPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await subscriptionPlanService.getAll({
        isPopular: true,
        status: "active",
      });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Popular plans fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Update plan features specifically
  static async updatePlanFeatures(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { contractorFeatures } = req.body;

      if (!contractorFeatures) {
        return res
          .status(400)
          .json(new ApiError(400, "Contractor features are required"));
      }

      const result = await subscriptionPlanService.updateById(id, {
        contractorFeatures,
      });

      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Plan not found or failed to update"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Plan features updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Toggle plan status
  static async togglePlanStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const plan = await subscriptionPlanService.getById(id);

      if (!plan) {
        return res
          .status(404)
          .json(new ApiError(404, "Plan not found"));
      }

      const newStatus = plan.status === "active" ? "inactive" : "active";
      const result = await subscriptionPlanService.updateById(id, {
        status: newStatus,
      });

      return res
        .status(200)
        .json(new ApiResponse(200, result, `Plan status changed to ${newStatus}`));
    } catch (err) {
      next(err);
    }
  }

  // Get feature summary for a plan
  static async getPlanFeaturesSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const plan = await subscriptionPlanService.getById(id);

      if (!plan) {
        return res
          .status(404)
          .json(new ApiError(404, "Plan not found"));
      }

      const featuresSummary = SubscriptionPlanFeatureService.getFeaturesSummary(plan);

      return res
        .status(200)
        .json(new ApiResponse(200, { plan: plan.displayName, features: featuresSummary }, "Features summary retrieved successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Compare multiple plans
  static async comparePlans(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { planIds } = req.body;

      if (!Array.isArray(planIds) || planIds.length === 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Provide array of plan IDs to compare"));
      }

      const plans = await Promise.all(
        planIds.map(id => subscriptionPlanService.getById(id))
      );

      const invalidPlans = plans.filter(p => !p);
      if (invalidPlans.length > 0) {
        return res
          .status(404)
          .json(new ApiError(404, "One or more plans not found"));
      }

      const comparison = plans.map(plan => ({
        id: plan._id,
        name: plan.displayName,
        planType: plan.planType,
        basePrice: plan.basePrice,
        billingCycle: plan.billingCycle,
        features: SubscriptionPlanFeatureService.getFeaturesSummary(plan),
      }));

      return res
        .status(200)
        .json(new ApiResponse(200, comparison, "Plans comparison retrieved successfully"));
    } catch (err) {
      next(err);
    }
  }
}
