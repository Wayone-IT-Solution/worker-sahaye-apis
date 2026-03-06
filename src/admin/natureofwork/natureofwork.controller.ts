import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import NatureOfWork from "../../modals/natureofwork.model";
import { CommonService } from "../../services/common.services";
import { normalizePayloadToArray } from "../../utils/payloadSanitizer";

const NatureOfWorkService = new CommonService(NatureOfWork);

export class NatureOfWorkController {
  static async createNatureOfWork(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const isBulkPayload = Array.isArray(req.body);
      const rows = normalizePayloadToArray(req.body);
      if (!rows.length) {
        return res
          .status(400)
          .json(new ApiError(400, "Request payload is empty"));
      }

      for (let index = 0; index < rows.length; index += 1) {
        const name = String(rows[index]?.name ?? "").trim();
        const type = String(rows[index]?.type ?? "").trim();
        if (!name || !type) {
          return res.status(400).json(
            new ApiError(
              400,
              `Row ${index + 1}: "name" and "type" are required`
            )
          );
        }
        rows[index].name = name;
        rows[index].type = type;
      }

      const result = isBulkPayload
        ? await NatureOfWork.insertMany(rows)
        : await NatureOfWorkService.create(rows[0] as any);
      if (!result || (Array.isArray(result) && result.length === 0))
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create NatureOfWork"));
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            isBulkPayload
              ? `${(result as any[])?.length || rows.length} records created successfully`
              : "Created successfully"
          )
        );
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
      const query: any = { ...req.query };
      const isAuthenticatedRequest = Boolean((req as any).user?.id);

      if (!isAuthenticatedRequest && query.status === undefined) {
        query.status = "active";
      }
      if (!query.sortKey && !query.multiSort) {
        query.multiSort = "order:asc,name:asc";
      }

      const result = await NatureOfWorkService.getAll(query);
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
