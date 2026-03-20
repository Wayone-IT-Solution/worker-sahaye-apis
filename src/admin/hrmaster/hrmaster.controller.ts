import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import HRMaster, { HRMasterType } from "../../modals/hrmaster.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { normalizePayloadToArray } from "../../utils/payloadSanitizer";

const hrMasterService = new CommonService(HRMaster);
const allowedHrMasterTypes = new Set<string>(Object.values(HRMasterType));

const parseRequestedTypes = (rawType: unknown): string[] => {
  if (!rawType) return [];

  const values = Array.isArray(rawType) ? rawType : [rawType];

  return values
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export class HRMasterController {
  static async createHRMaster(req: Request, res: Response, next: NextFunction) {
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
        if (!allowedHrMasterTypes.has(type)) {
          return res.status(400).json(
            new ApiError(
              400,
              `Row ${index + 1}: invalid "type" "${type}". Use one of: ${Object.values(HRMasterType).join(", ")}`
            )
          );
        }
        rows[index].name = name;
        rows[index].type = type;
      }

      const result = isBulkPayload
        ? await HRMaster.insertMany(rows)
        : await hrMasterService.create(rows[0] as any);

      if (!result || (Array.isArray(result) && result.length === 0))
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create HR master"));
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

  static async getAllHRMasters(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const query: any = { ...req.query };
      const requestedTypes = parseRequestedTypes(query.type);
      const isAuthenticatedRequest = Boolean((req as any).user?.id);

      if (requestedTypes.length) {
        const invalidTypes = requestedTypes.filter(
          (type) => !allowedHrMasterTypes.has(type)
        );

        if (invalidTypes.length) {
          return res.status(400).json(
            new ApiError(
              400,
              `Invalid HR master type: ${invalidTypes.join(", ")}. Allowed types: ${Object.values(HRMasterType).join(", ")}`
            )
          );
        }

        if (requestedTypes.length === 1) {
          query.type = requestedTypes[0];
        } else {
          delete query.type;
          query.type__in = requestedTypes.join(",");
        }
      }

      if (!isAuthenticatedRequest && query.status === undefined) {
        query.status = "active";
      }
      if (!query.sortKey && !query.multiSort) {
        query.multiSort = "order:asc,name:asc";
      }

      const result = await hrMasterService.getAll(query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getHRMasterById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await hrMasterService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "HR master not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateHRMasterById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (req.body?.type !== undefined) {
        const nextType = String(req.body.type).trim();
        if (!allowedHrMasterTypes.has(nextType)) {
          return res.status(400).json(
            new ApiError(
              400,
              `Invalid "type" "${nextType}". Allowed types: ${Object.values(HRMasterType).join(", ")}`
            )
          );
        }
        req.body.type = nextType;
      }

      const result = await hrMasterService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update HR master"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteHRMasterById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await hrMasterService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete HR master"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
