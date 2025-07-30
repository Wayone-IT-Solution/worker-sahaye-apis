import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { PlanFeatureMapping } from "../../modals/planfeaturemapping.model";
import { EnrolledPlan } from "../../modals/enrollplan.model";

const PlanFeatureMappingService = new CommonService(PlanFeatureMapping);

export class PlanFeatureMappingController {
  static async createPlanFeatureMapping(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PlanFeatureMappingService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create plan feature"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAmountByUserType(req: Request, res: Response) {
    try {
      const { id: userId } = (req as any).user;
      const enrolledPlan = await EnrolledPlan.findOne({ user: userId, status: "active" });
      const planId = enrolledPlan?.plan;

      let amount = 549;
      if (planId) {
        const mapping = await PlanFeatureMapping.findOne({
          planId,
          isEnabled: "active",
        });
        if (mapping) amount = mapping.amount;
      }
      return res.status(200).json(
        new ApiResponse(200, {
          amount,
          hasActivePlan: !!enrolledPlan,
        })
      );
    } catch (err: any) {
      const status = err instanceof ApiError ? err.statusCode : 500;
      return res.status(status).json(new ApiError(status, err.message));
    }
  }

  static async getAllPlanFeatureMappings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "planId",
            foreignField: "_id",
            as: "planDetails",
          },
        },
        { $unwind: "$planDetails" },
        {
          $lookup: {
            from: "features",
            localField: "featureId",
            foreignField: "_id",
            as: "featureDetails",
          },
        },
        { $unwind: "$planDetails" },
        {
          $project: {
            _id: 1,
            amount: 1,
            createdAt: 1,
            isEnabled: 1,
            updatedAt: 1,
            "planDetails": 1,
            "featureDetails": 1,
          },
        },
      ];
      const result = await PlanFeatureMappingService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPlanFeatureMappingById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PlanFeatureMappingService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "plan feature not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updatePlanFeatureMappingById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PlanFeatureMappingService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update plan feature"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deletePlanFeatureMappingById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PlanFeatureMappingService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete plan feature"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
