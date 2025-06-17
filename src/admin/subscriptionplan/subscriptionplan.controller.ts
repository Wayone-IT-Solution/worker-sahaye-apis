import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { SubscriptionPlan } from "../../modals/subscriptionplan.model";

const subscriptionPlanService = new CommonService(SubscriptionPlan);

export class SubscriptionplanController {
  static async createSubscriptionplan(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await subscriptionPlanService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create worker category"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
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
      const result = await subscriptionPlanService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
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
          .json(new ApiError(404, "Worker category not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
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
      const result = await subscriptionPlanService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update worker category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
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
          .json(new ApiError(404, "Failed to delete worker category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
