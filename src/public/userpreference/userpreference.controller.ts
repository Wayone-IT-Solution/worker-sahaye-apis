import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { UserPreference } from "../../modals/userpreference.model";

const userPreferenceService = new CommonService(UserPreference);

export class UserPreferenceController {
  static async getAllUserPreferences(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "jobcategories",
            localField: "jobRole",
            foreignField: "_id",
            as: "jobRoleDetails",
          },
        },
        { $unwind: "$jobRoleDetails" },
        {
          $project: {
            _id: 1,
            jobType: 1,
            workModes: 1,
            experienceLevel: 1,
            preferredLocations: 1,
            isWillingToRelocate: 1,
            "userDetails.email": 1,
            "userDetails.mobile": 1,
            "jobRoleDetails.name": 1,
            "jobRoleDetails.type": 1,
            "userDetails.fullName": 1,
          },
        },
      ];
      const result = await userPreferenceService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getUserPreferenceById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await userPreferenceService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "user preference not found"));

      const preference = await UserPreference.findOne({ _id: req.params.id })
        .populate("userId", "fullName email mobile")
        .populate("jobRole", "name type description");

      return res
        .status(200)
        .json(new ApiResponse(200, preference, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateUserPreferenceById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const existingPref = await UserPreference.findOne({ userId: user });

      if (!existingPref) {
        const data = { ...req.body, userId: user };
        const result = await userPreferenceService.create(data);
        if (!result)
          return res
            .status(400)
            .json(new ApiError(400, "Failed to create user Preferences"));
        return res
          .status(201)
          .json(new ApiResponse(201, result, "Created successfully"));
      }
      const updatedPref = await UserPreference.findOneAndUpdate(
        { userId: user },
        { $set: req.body },
        { new: true }
      );
      return res
        .status(200)
        .json(new ApiResponse(200, updatedPref, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteUserPreferenceById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await userPreferenceService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete user preference"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
