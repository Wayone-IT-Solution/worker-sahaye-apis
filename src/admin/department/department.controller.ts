import ApiError from "../../utils/ApiError";
import Department from "../../modals/department.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { normalizePayloadToArray } from "../../utils/payloadSanitizer";

const DepartmentService = new CommonService(Department);

export class DepartmentController {
  static async createDepartment(
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
        ? await Department.insertMany(rows)
        : await DepartmentService.create(rows[0] as any);
      if (!result || (Array.isArray(result) && result.length === 0))
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Department"));
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

  static async createAllDepartment(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await Department.insertMany(req.body);
      if (!result || result.length === 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to insert departments"));
      }
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Departments created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllDepartments(
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

      const result = await DepartmentService.getAll(query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getDepartmentById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await DepartmentService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "Department not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateDepartmentById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await DepartmentService.updateById(
        req.params.id,
        req.body,
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Department"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteDepartmentById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await DepartmentService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Department"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
