import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import WorkerCategory from "../../modals/workercategory.model";
import { normalizePayloadToArray } from "../../utils/payloadSanitizer";

const workerCategoryService = new CommonService(WorkerCategory);

export class WorkercategoryController {
  static async createWorkercategory(
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

      const normalizedRows = rows.map((row, index) => {
        const type = String(row?.type ?? "").trim();
        if (!type) {
          throw new ApiError(400, `Row ${index + 1}: "type" is required`);
        }
        return {
          ...row,
          type,
        };
      });

      const result = isBulkPayload
        ? await WorkerCategory.insertMany(normalizedRows)
        : await workerCategoryService.create(normalizedRows[0] as any);
      if (!result || (Array.isArray(result) && result.length === 0))
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create worker category"));
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            isBulkPayload
              ? `${(result as any[])?.length || normalizedRows.length} records created successfully`
              : "Created successfully"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllWorkercategorys(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query: any = { ...req.query };
      if (!query.sortKey && !query.multiSort) {
        query.multiSort = "order:asc,type:asc";
      }
      const result = await workerCategoryService.getAll(query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getWorkercategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await workerCategoryService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Worker category not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateWorkercategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await workerCategoryService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update worker category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteWorkercategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await workerCategoryService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete worker category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
