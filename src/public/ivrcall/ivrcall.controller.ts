import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Feature } from "../../modals/feature.model";
import { IVRCallModel } from "../../modals/ivrcall.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const IVRCallService = new CommonService(IVRCallModel);

export class IVRCallController {
  static async createIVRCall(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = (req as any).user;
      const { featureId } = req.body;

      if (!featureId) {
        return res
          .status(400)
          .json(new ApiError(400, "Feature ID is required"));
      }

      // Get today's date range
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Count how many IVR calls the user has made today
      const todayCallCount = await IVRCallModel.countDocuments({
        userId,
        featureId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });

      if (todayCallCount >= 3) {
        return res
          .status(429)
          .json(
            new ApiError(429, "You can only create up to 3 IVR calls per day.")
          );
      }

      const result = await IVRCallService.create({ ...req.body, userId });
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create IVR Call"));

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllIVRCalls(req: Request, res: Response, next: NextFunction) {
    try {
      let featureId = "";
      const featureKey: any = {
        lwf: "LWF Support",
        esic: "ESIC Support",
        epf: "EPF Contribution",
      };
      let { feature } = req.params;
      if (feature) {
        feature = featureKey[feature];
        if (feature) {
          const featureData: any = await Feature.findOne({ name: feature });
          if (featureData) featureId = featureData?._id.toString();
        }
      }

      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "features",
            localField: "featureId",
            foreignField: "_id",
            as: "featureDetails",
          },
        },
        {
          $unwind: {
            path: "$featureDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "agents",
            localField: "pickedBy",
            foreignField: "_id",
            as: "agentDetails",
          },
        },
        {
          $unwind: {
            path: "$agentDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            status: 1,
            pickedBy: 1,
            createdAt: 1,
            updatedAt: 1,
            featureId: 1,
            mobile: "$userDetails.mobile",
            agentName: "$agentDetails.name",
            username: "$userDetails.fullName",
            agentMobile: "$agentDetails.mobile",
            featureName: "$featureDetails.name",
            visibleTo: "$featureDetails.visibleTo",
          },
        },
      ];
      const result = await IVRCallService.getAll(
        { ...req.query, featureId },
        pipeline
      );
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getIVRCallById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await IVRCallService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "IVR Call not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateIVRCallById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await IVRCallService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update IVR Call"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteIVRCallById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await IVRCallService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete IVR Call"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
