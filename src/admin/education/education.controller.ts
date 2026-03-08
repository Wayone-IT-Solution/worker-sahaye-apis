import ApiError from "../../utils/ApiError";
import Education from "../../modals/education.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { normalizePayloadToArray } from "../../utils/payloadSanitizer";

const EducationService = new CommonService(Education);

export class EducationController {
  static async createEducation(
    req: Request,
    res: Response,
    next: NextFunction,
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
        if (!name) {
          return res
            .status(400)
            .json(new ApiError(400, `Row ${index + 1}: "name" is required`));
        }
        rows[index].name = name;
      }

      const result = isBulkPayload
        ? await Education.insertMany(rows)
        : await EducationService.create(rows[0] as any);
      if (!result || (Array.isArray(result) && result.length === 0))
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Education"));
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            isBulkPayload
              ? `${(result as any[])?.length || rows.length} records created successfully`
              : "Created successfully",
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  static async createAllEducation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await Education.insertMany(req.body);
      if (!result || result.length === 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to insert education records"));
      }
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            "Education records created successfully",
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllEducation(
    req: Request,
    res: Response,
    next: NextFunction,
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

      const result = await EducationService.getAll(query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getEducationById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await EducationService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "Education not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateEducationById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await EducationService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Education"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteEducationById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await EducationService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Education"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
