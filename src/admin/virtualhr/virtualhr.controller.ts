import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { VirtualHR } from "../../modals/virtualhr.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { sendSingleNotification } from "../../services/notification.service";
import { UserType } from "../../modals/notification.model";

const virtualHRService = new CommonService(VirtualHR);

// Helper function to convert string values to proper types
const normalizeVirtualHRData = (data: any) => {
  const normalized = { ...data };

  // Convert isActive from string to boolean
  if (typeof normalized.isActive === "string") {
    normalized.isActive = normalized.isActive === "true" || normalized.isActive === "Active" || normalized.isActive === true;
  }

  // Convert experienceInYears to number
  if (normalized.experienceInYears) {
    normalized.experienceInYears = parseInt(String(normalized.experienceInYears), 10);
  }

  // Ensure mobile is a string and validate format
  if (normalized.mobile) {
    normalized.mobile = String(normalized.mobile).trim();
    // Mobile validation: should start with 6-9 and be 10 digits
    if (!/^[6-9]\d{9}$/.test(normalized.mobile)) {
      throw new Error("Mobile number must be a valid Indian mobile number (10 digits starting with 6-9)");
    }
  }

  // Ensure arrays
  if (normalized.languagesSpoken && typeof normalized.languagesSpoken === "string") {
    normalized.languagesSpoken = normalized.languagesSpoken.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  if (normalized.expertiseAreas && typeof normalized.expertiseAreas === "string") {
    normalized.expertiseAreas = normalized.expertiseAreas.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  if (normalized.preferredIndustries && typeof normalized.preferredIndustries === "string") {
    normalized.preferredIndustries = normalized.preferredIndustries.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  if (normalized.availableDays && typeof normalized.availableDays === "string") {
    normalized.availableDays = normalized.availableDays.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  if (normalized.communicationModes && typeof normalized.communicationModes === "string") {
    normalized.communicationModes = normalized.communicationModes.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  return normalized;
};

export class VirtualHRController {
  static async createVirtualHR(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Normalize the incoming data
      const normalizedData = normalizeVirtualHRData(req.body);

      const duplicate = await VirtualHR.findOne({
        $or: [
          { email: normalizedData.email },
          { mobile: normalizedData.mobile },
          { name: normalizedData.name }
        ]
      });

      if (duplicate) {
        return res
          .status(409)
          .json(new ApiError(409, "Virtual HR with same name, email, or mobile already exists."));
      }
      const result = await virtualHRService.create(normalizedData);
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Virtual HR profile"));
      }

      // Send notification to admin that a new Virtual HR has been created
      try {
        await sendSingleNotification({
          type: "virtual-hr-created",
          context: {
            hrName: normalizedData.name || "Virtual HR Professional"
          },
          toUserId: (result._id as any).toString(),
          toRole: UserType.VIRTUAL_HR,
        });
      } catch (notificationError) {
        console.log("Notification error (non-blocking):", notificationError);
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Virtual HR created successfully"));
    } catch (err: any) {
      return res
        .status(400)
        .json(new ApiError(400, err?.message || "Validation error"));
    }
  }

  static async getAllVirtualHRs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Disable caching for this query
      const query = { ...req.query, isCached: false };
      
      // Virtual HR is an admin-managed resource, no userId filtering needed
      const result = await virtualHRService.getAll(query);
      
      // Ensure we always return 200 with fresh data
      return res
        .status(200)
        .set("Cache-Control", "no-cache, no-store, must-revalidate")
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getVirtualHRById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await virtualHRService.getById(req.params.id, false);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "bulk hiring not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateVirtualHRById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;

      const record = await virtualHRService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Virtual HR profile not found."));
      }

      // Normalize the incoming data
      const normalizedData = normalizeVirtualHRData(req.body);

      const result = await virtualHRService.updateById(id, normalizedData);
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to update Virtual HR profile."));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Virtual HR profile updated successfully."));
    } catch (err: any) {
      return res
        .status(400)
        .json(new ApiError(400, err?.message || "Validation error"));
    }
  }

  static async deleteVirtualHRById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await virtualHRService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Virtual HR profile not found."));
      }

      // ✅ Optional: prevent deletion if it's still marked active
      if (record.isActive) {
        return res
          .status(400)
          .json(new ApiError(400, "Please deactivate the profile before deleting."));
      }

      const result = await virtualHRService.deleteById(id);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Virtual HR profile deleted successfully."));
    } catch (err) {
      next(err);
    }
  }
}
