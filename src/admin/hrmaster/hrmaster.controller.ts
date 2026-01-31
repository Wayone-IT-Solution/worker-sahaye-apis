import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import HRMaster from "../../modals/hrmaster.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const hrMasterService = new CommonService(HRMaster);

export class HRMasterController {
  static async createHRMaster(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hrMasterService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create HR master"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllHRMasters(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await hrMasterService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getHRMasterById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await hrMasterService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "HR master not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateHRMasterById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await hrMasterService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update HR master"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteHRMasterById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await hrMasterService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete HR master"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
