import ApiError from "../../utils/ApiError";
import Function from "../../modals/function.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { normalizePayloadToArray } from "../../utils/payloadSanitizer";

const FunctionService = new CommonService(Function);

export class FunctionController {
  static async createFunction(req: Request, res: Response, next: NextFunction) {
    try {
      const isBulkPayload = Array.isArray(req.body);
      const rows = normalizePayloadToArray(req.body);
      if (!rows.length) {
        return res
          .status(400)
          .json(new ApiError(400, "Request payload is empty"));
      }

      // Import Department to resolve departmentId
      const Department = (await import("../../modals/department.model"))
        .default;
      const { default: mongoose } = await import("mongoose");

      // Helper to resolve departmentId from name to ObjectId
      const resolveDepartmentId = async (
        value: any,
      ): Promise<string | undefined> => {
        if (!value) return undefined;
        const stringValue = String(value).trim();
        if (!stringValue) return undefined;

        // Check if it's already a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(stringValue)) {
          const exists = await Department.exists({ _id: stringValue });
          if (exists) return stringValue;
        }

        // Try to find by name
        const byName = await Department.findOne(
          { name: { $regex: new RegExp(`^${stringValue}$`, "i") } },
          { _id: 1 },
        );
        if (byName?._id) return String(byName._id);

        return undefined;
      };

      for (let index = 0; index < rows.length; index += 1) {
        const name = String(rows[index]?.name ?? "").trim();
        if (!name) {
          return res
            .status(400)
            .json(new ApiError(400, `Row ${index + 1}: "name" is required`));
        }

        // Resolve departmentId if provided
        if (rows[index]?.departmentId) {
          const resolvedDepartmentId = await resolveDepartmentId(
            rows[index].departmentId,
          );
          if (resolvedDepartmentId) {
            rows[index].departmentId = resolvedDepartmentId;
          } else {
            // If departmentId was provided but couldn't be resolved, remove it
            delete rows[index].departmentId;
          }
        }

        rows[index].name = name;
      }

      const result = isBulkPayload
        ? await Function.insertMany(rows)
        : await FunctionService.create(rows[0] as any);
      if (!result || (Array.isArray(result) && result.length === 0))
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Function"));
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

  static async createAllFunction(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await Function.insertMany(req.body);
      if (!result || result.length === 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to insert functions"));
      }
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Functions created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllFunctions(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const lookupStage = {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "departmentId",
        },
      };

      // Transform the populated array to single object or null
      const addFieldsStage = {
        $addFields: {
          departmentId: {
            $cond: {
              if: { $gt: [{ $size: "$departmentId" }, 0] },
              then: { $arrayElemAt: ["$departmentId", 0] },
              else: null,
            },
          },
        },
      };

      const result = await FunctionService.getAll(req.query, [
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

  static async getActiveFunctions(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const query: any = {
        status: "active",
        pagination: "false",
        sortKey: "order",
        sortDir: "asc",
      };
      // allow optional limit
      if (req.query.limit) query.limit = req.query.limit;

      // Add $lookup stage to populate workerCategoryId with WorkerCategory data
      const lookupStage = {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "departmentId",
        },
      };

      // Transform the populated array to single object or null
      const addFieldsStage = {
        $addFields: {
          departmentId: {
            $cond: {
              if: { $gt: [{ $size: "$departmentId" }, 0] },
              then: { $arrayElemAt: ["$departmentId", 0] },
              else: null,
            },
          },
        },
      };

      const result = await FunctionService.getAll(query, [
        lookupStage,
        addFieldsStage,
      ]);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Active functions fetched"));
    } catch (err) {
      next(err);
    }
  }

  static async getFunctionById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await FunctionService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "Function not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateFunctionById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await FunctionService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Function"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteFunctionById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await FunctionService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Function"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
