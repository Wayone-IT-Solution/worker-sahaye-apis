import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { VirtualHR } from "../../modals/virtualhr.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const virtualHRService = new CommonService(VirtualHR);

export class VirtualHRController {
  static async createVirtualHR(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const duplicate = await VirtualHR.findOne({
        $or: [
          { email: req.body.email },
          { mobile: req.body.mobile },
          { name: req.body.name }
        ]
      });

      if (duplicate) {
        return res
          .status(409)
          .json(new ApiError(409, "Virtual HR with same name, email, or mobile already exists."));
      }
      const result = await virtualHRService.create(req.body);
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Virtual HR profile"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Virtual HR created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllVirtualHRs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const result = await virtualHRService.getAll({ ...req.query, ...(role === "admin" ? {} : userId) });
      return res
        .status(200)
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
      const result = await virtualHRService.getById(req.params.id);
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

      const result = await virtualHRService.updateById(id, req.body);
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to update Virtual HR profile."));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Virtual HR profile updated successfully."));
    } catch (err) {
      next(err);
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
