import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { Festival } from "../../modals/festival.model";

const FestivalService = new CommonService(Festival);

export class FestivalController {
  static async createFestival(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { date, note } = req.body;

      if (!date || !note) {
        return res.status(400).json(
          new ApiError(400, "Date and note are required")
        );
      }

      // Check if date already exists
      const existing: any = await FestivalService.getAll({ date });
      const existingData = Array.isArray(existing) ? existing : existing?.result || [];
      
      if (existingData?.length > 0) {
        return res.status(400).json(
          new ApiError(400, "Festival date already exists")
        );
      }

      const result = await FestivalService.create({ date, note });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create festival date"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Festival date created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllFestivals(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await FestivalService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Festival dates fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getFestivalById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await FestivalService.getById(req.params.id);
      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Festival date not found"));
      }
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Festival date fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteFestival(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await FestivalService.deleteById(req.params.id);
      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Festival date not found"));
      }
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Festival date deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
