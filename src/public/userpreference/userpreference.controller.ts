import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { UserPreference } from "../../modals/userpreference.model";

const userPreferenceService = new CommonService(UserPreference);

// ✅ Normalize multi-select fields
function processMultiSelectFields(data: any): any {
  const processed = { ...data };
  const arrayFields = ["workModes", "jobTypes", "preferredLocations"]; // ✅ FIXED

  arrayFields.forEach((field) => {
    const value = processed[field];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        processed[field] = value.filter(
          (item: any) => item && String(item).trim().length > 0,
        );
      } else if (typeof value === "string" && value.trim().length > 0) {
        processed[field] = [value.trim()];
      } else {
        processed[field] = [];
      }
    }
  });

  return processed;
}

export class UserPreferenceController {
  // ✅ GET ALL
  static async getAllUserPreferences(
    req: Request,
    res: Response,
    next: NextFunction,
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
            from: "jobcategories", // ✅ FIXED (removed \n)
            localField: "jobRoles",
            foreignField: "_id",
            as: "jobRoleDetails",
          },
        },

        {
          $project: {
            _id: 1,
            jobTypes: 1, // ✅ FIXED
            updatedAt: 1,
            createdAt: 1,
            workModes: 1,
            experienceLevel: 1,
            preferredLocations: 1,
            isWillingToRelocate: 1,

            "userDetails.email": 1,
            "userDetails.mobile": 1,
            "userDetails.fullName": 1,

            jobRoleDetails: {
              name: 1,
              type: 1,
            },
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

  // ✅ GET BY ID
  static async getUserPreferenceById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const preference = await UserPreference.findById(req.params.id)
        .populate("userId", "fullName email mobile")
        .populate("jobRoles", "name type description");

      if (!preference) {
        return res
          .status(404)
          .json(new ApiError(404, "User preference not found"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, preference, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  // ✅ CREATE / UPDATE
  static async updateUserPreferenceById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id: user } = (req as any).user;

      let bodyData = { ...req.body };

      // ✅ Convert jobRoles to ObjectId
      if (Array.isArray(bodyData.jobRoles)) {
        bodyData.jobRoles = bodyData.jobRoles
          .map((id: string) => new mongoose.Types.ObjectId(id))
          .filter(Boolean);
      }

      bodyData = processMultiSelectFields(bodyData);

      const updatedPref = await UserPreference.findOneAndUpdate(
        { userId: user },
        { $set: bodyData },
        { new: true, upsert: true }, // ✅ auto create if not exists
      );

      return res
        .status(200)
        .json(new ApiResponse(200, updatedPref, "Saved successfully"));
    } catch (err) {
      next(err);
    }
  }

  // ✅ DELETE
  static async deleteUserPreferenceById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await userPreferenceService.deleteById(req.params.id);

      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete user preference"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  // ✅ UNIQUE LOCATIONS
  static async getAllUniquePreferredLocations(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const pipeline = [
        { $unwind: "$preferredLocations" },
        {
          $project: {
            location: {
              $toLower: { $trim: { input: "$preferredLocations" } },
            },
          },
        },
        {
          $group: {
            _id: null,
            locations: { $addToSet: "$location" },
          },
        },
        {
          $project: {
            _id: 0,
            locations: {
              $map: {
                input: "$locations",
                as: "loc",
                in: {
                  $concat: [
                    { $toUpper: { $substrCP: ["$$loc", 0, 1] } },
                    {
                      $substrCP: ["$$loc", 1, { $strLenCP: "$$loc" }],
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            locations: {
              $sortArray: { input: "$locations", sortBy: 1 },
            },
          },
        },
      ];

      const result = await UserPreference.aggregate(pipeline);
      const locations = result[0]?.locations || [];

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            locations,
            "Unique preferred locations fetched successfully",
          ),
        );
    } catch (err) {
      next(err);
    }
  }
}
