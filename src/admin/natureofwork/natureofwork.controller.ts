import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import NatureOfWork from "../../modals/natureofwork.model";
import { CommonService } from "../../services/common.services";

const NatureOfWorkService = new CommonService(NatureOfWork);

export class NatureOfWorkController {
  static async createNatureOfWork(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await NatureOfWorkService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create NatureOfWork"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async createAllNatureOfWork(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await NatureOfWork.insertMany(req.body);
      if (!result || result.length === 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to insert job categories"));
      }
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Job categories created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllNatureOfWorks(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await NatureOfWorkService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getNatureOfWorkById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await NatureOfWorkService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "NatureOfWork not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateNatureOfWorkById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await NatureOfWorkService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update NatureOfWork"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteNatureOfWorkById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await NatureOfWorkService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete NatureOfWork"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
