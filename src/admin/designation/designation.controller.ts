import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import Designation from "../../modals/designation.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const designationService = new CommonService(Designation as any);

export class DesignationController {
  static async createDesignation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { workerCategoryId, ...restBody } = req.body;

      // If workerCategoryId is provided, resolve it to a valid ObjectId
      let resolvedWorkerCategoryId = workerCategoryId;
      if (workerCategoryId) {
        const WorkerCategory = (
          await import("../../modals/workercategory.model")
        ).default;
        const { default: mongoose } = await import("mongoose");
        const stringValue = String(workerCategoryId).trim();

        // Check if it's already a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(stringValue)) {
          const exists = await WorkerCategory.exists({ _id: stringValue });
          if (exists) resolvedWorkerCategoryId = stringValue;
        } else {
          // Try to find by type (name)
          const byType = await WorkerCategory.findOne(
            { type: { $regex: new RegExp(`^${stringValue}$`, "i") } },
            { _id: 1 },
          );
          if (byType?._id) resolvedWorkerCategoryId = String(byType._id);
        }
      }

      const result = await designationService.create({
        ...restBody,
        ...(resolvedWorkerCategoryId && {
          workerCategoryId: resolvedWorkerCategoryId,
        }),
      } as any);
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
      const lookupStage = {
        $lookup: {
          from: "workercategories",
          localField: "workerCategoryId",
          foreignField: "_id",
          as: "workerCategoryId",
        },
      };

      // Transform the populated array to single object or null
      const addFieldsStage = {
        $addFields: {
          workerCategoryId: {
            $cond: {
              if: { $gt: [{ $size: "$workerCategoryId" }, 0] },
              then: { $arrayElemAt: ["$workerCategoryId", 0] },
              else: null,
            },
          },
        },
      };

      const result = await designationService.getAll(req.query, [
        lookupStage,
        addFieldsStage,
      ]);
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
      const query: any = {
        isActive: true,
        pagination: false,
        sortKey: "order",
        sortDir: "asc",
      };
      // allow optional limit
      if (req.query.limit) query.limit = req.query.limit;

      // Add $lookup stage to populate workerCategoryId with WorkerCategory data
      const lookupStage = {
        $lookup: {
          from: "workercategories",
          localField: "workerCategoryId",
          foreignField: "_id",
          as: "workerCategoryId",
        },
      };

      // Transform the populated array to single object or null
      const addFieldsStage = {
        $addFields: {
          workerCategoryId: {
            $cond: {
              if: { $gt: [{ $size: "$workerCategoryId" }, 0] },
              then: { $arrayElemAt: ["$workerCategoryId", 0] },
              else: null,
            },
          },
        },
      };

      const result = await designationService.getAll(query, [
        lookupStage,
        addFieldsStage,
      ]);
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
      // Populate workerCategoryId with WorkerCategory data
      const result = await Designation.findById(req.params.id)
        .populate("workerCategoryId", "type order isActive description")
        .lean();
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

      // Import WorkerCategory to resolve workerCategoryId
      const WorkerCategory = (await import("../../modals/workercategory.model"))
        .default;

      // Helper to resolve workerCategoryId from name/type to ObjectId
      const resolveWorkerCategoryId = async (
        value: any,
      ): Promise<string | undefined> => {
        if (!value) return undefined;
        const stringValue = String(value).trim();
        if (!stringValue) return undefined;

        // Check if it's already a valid ObjectId
        const { default: mongoose } = await import("mongoose");
        if (mongoose.Types.ObjectId.isValid(stringValue)) {
          const exists = await WorkerCategory.exists({ _id: stringValue });
          if (exists) return stringValue;
        }

        // Try to find by type (name)
        const byType = await WorkerCategory.findOne(
          { type: { $regex: new RegExp(`^${stringValue}$`, "i") } },
          { _id: 1 },
        );
        if (byType?._id) return String(byType._id);

        return undefined;
      };

      // Normalize and insert
      const normalized = await Promise.all(
        items.map(async (it: any) => {
          let workerCategoryId: string | undefined;
          if (it.workerCategoryId) {
            workerCategoryId = await resolveWorkerCategoryId(
              it.workerCategoryId,
            );
          }

          return {
            name: it.name?.trim(),
            slug: it.slug || (it.name || "").toLowerCase().replace(/\s+/g, "-"),
            order: Number(it.order) || 0,
            description: it.description || "",
            isActive: typeof it.isActive === "boolean" ? it.isActive : true,
            ...(workerCategoryId && { workerCategoryId }),
          };
        }),
      );

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
