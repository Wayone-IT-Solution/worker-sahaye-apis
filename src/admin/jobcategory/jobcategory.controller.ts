import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import JobCategory from "../../modals/jobcategory.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { normalizePayloadToArray } from "../../utils/payloadSanitizer";

const jobCategoryService = new CommonService(JobCategory);

export class JobcategoryController {
  static async createJobcategory(
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
        const name = String(row?.name ?? "").trim();
        const type = String(row?.type ?? "").trim();
        if (!name || !type) {
          throw new ApiError(400, `Row ${index + 1}: "name" and "type" are required`);
        }

        const isActiveValue = row?.isActive;
        const normalizedStatus = String(row?.status ?? "").trim().toLowerCase();
        const normalizedIsActive =
          typeof isActiveValue === "boolean"
            ? isActiveValue
            : normalizedStatus === "active"
              ? true
              : normalizedStatus === "inactive"
                ? false
                : undefined;

        const payload: Record<string, unknown> = {
          ...row,
          name,
          type,
        };

        if (normalizedIsActive !== undefined) {
          payload.isActive = normalizedIsActive;
        }

        delete payload.status;
        return payload;
      });

      const result = isBulkPayload
        ? await JobCategory.insertMany(normalizedRows)
        : await jobCategoryService.create(normalizedRows[0] as any);
      if (!result || (Array.isArray(result) && result.length === 0))
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create job category"));
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

  static async createAllJobcategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await JobCategory.insertMany(req.body);
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

  static async getAllJobcategorys(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query: any = { ...req.query };
      const isAuthenticatedRequest = Boolean((req as any).user?.id);

      if (query.status !== undefined && query.isActive === undefined) {
        const normalizedStatus = String(query.status).trim().toLowerCase();
        if (normalizedStatus === "active") query.isActive = true;
        if (normalizedStatus === "inactive") query.isActive = false;
        delete query.status;
      }

      if (
        !isAuthenticatedRequest &&
        query.isActive === undefined &&
        query.status === undefined
      ) {
        query.isActive = true;
      }
      if (!query.sortKey && !query.multiSort) {
        query.multiSort = "order:asc,name:asc";
      }

      const result = await jobCategoryService.getAll(query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getJobcategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await jobCategoryService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Job category not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateJobcategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await jobCategoryService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update job category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteJobcategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await jobCategoryService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete job category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
