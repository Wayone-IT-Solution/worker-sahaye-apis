import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import Designation from "../../modals/designation.model";

const designationService = new CommonService(Designation as any);

export class DesignationController {
  static async createDesignation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await designationService.create(req.body as any);
      if (!result)
        return res.status(400).json(new ApiError(400, "Failed to create"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllDesignations(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await designationService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getActiveDesignations(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const query: any = { isActive: true, pagination: false };
      // allow optional limit
      if (req.query.limit) query.limit = req.query.limit;
      const pipelineOpts = { sort: { order: 1 } } as any;
      const result = await designationService.getAll(query, pipelineOpts);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Active designations fetched"));
    } catch (err) {
      next(err);
    }
  }

  static async getDesignationById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await designationService.getById(req.params.id as string);
      if (!result)
        return res.status(404).json(new ApiError(404, "designation not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateDesignationById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await designationService.updateById(
        req.params.id as string,
        req.body as any,
      );
      if (!result)
        return res.status(404).json(new ApiError(404, "Failed to update"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteDesignationById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await designationService.deleteById(
        req.params.id as string,
      );
      if (!result)
        return res.status(404).json(new ApiError(404, "Failed to delete"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async bulkUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const items = req.body?.items || req.body;
      if (!Array.isArray(items) || items.length === 0)
        return res
          .status(400)
          .json(new ApiError(400, "Invalid payload for bulk upload"));

      // Normalize and insert
      const normalized = items.map((it: any) => ({
        name: it.name?.trim(),
        slug: it.slug || (it.name || "").toLowerCase().replace(/\s+/g, "-"),
        order: Number(it.order) || 0,
        description: it.description || "",
        isActive: typeof it.isActive === "boolean" ? it.isActive : true,
      }));

      const inserted = await (Designation as any).insertMany(normalized, {
        ordered: false,
      });
      return res
        .status(201)
        .json(new ApiResponse(201, inserted, "Bulk upload successful"));
    } catch (err) {
      next(err);
    }
  }
}

export default DesignationController;
