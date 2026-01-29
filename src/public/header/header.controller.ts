import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Header, IHeader } from "../../modals/header.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const HeaderService = new CommonService<IHeader>(Header);

export class HeaderController {
  // Create header with icon
  static async createHeader(req: Request, res: Response, next: NextFunction) {
    try {
      const iconUrl = req?.body?.icon?.[0]?.url;
      // Icon is optional, so we don't require it

      const result = await HeaderService.create({
        ...req.body,
        icon: iconUrl || undefined,
      });
      if (!result)
        return res.status(400).json(new ApiError(400, "Failed to create header"));

      return res.status(201).json(new ApiResponse(201, result, "Header created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getServicesByType(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceFor } = req.params;

      const validServiceTypes = ["ESIC", "EPFO", "LOAN", "LWF"];
      if (!validServiceTypes.includes(serviceFor)) {
        return res.status(400).json({
          success: false,
          message: `Service type must be one of: ${validServiceTypes.join(", ")}`,
        });
      }

      // Bypass query-based sorting by removing sortKey and sortDir from query
      const cleanQuery = { ...req.query };
      delete cleanQuery.sortKey;
      delete cleanQuery.sortDir;

      const pipeline: any[] = [
        {
          $match: { parent: serviceFor }
        },
        {
          $sort: { order: 1 }
        }
      ];

      const data = await HeaderService.getAll(cleanQuery, pipeline);

      // Ensure results are sorted by order (additional safeguard)
      if (data && typeof data === 'object' && 'result' in data && Array.isArray(data.result)) {
        data.result.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      }

      return res.status(200).json(
        new ApiResponse(
          200,
          data,
          `Headers for ${serviceFor} fetched successfully`
        )
      );
    } catch (err) {
      next(err);
    }
  };

  // Get all headers
  static async getAllHeaders(req: Request, res: Response, next: NextFunction) {
    try {
      const pipeline: any[] = [
        {
          $sort: { order: 1 },
        },
      ];

      const data = await HeaderService.getAll(req.query, pipeline);
      return res.status(200).json(
        new ApiResponse(
          200,
          data,
          "Headers fetched successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  // Get header by ID
  static async getHeaderById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await HeaderService.getById(req.params.id);
      if (!result) return res.status(404).json(new ApiError(404, "Header not found"));

      return res.status(200).json(new ApiResponse(200, result, "Header fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Update header by ID (with optional icon update)
  static async updateHeaderById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const record = await HeaderService.getById(id);
      if (!record)
        return res.status(404).json(new ApiError(404, "Header not found"));

      const iconUrl = req?.body?.icon?.[0]?.url || record.icon;

      const result = await HeaderService.updateById(id, {
        ...req.body,
        icon: iconUrl,
      });

      if (!result) return res.status(400).json(new ApiError(400, "Failed to update header"));

      return res.status(200).json(new ApiResponse(200, result, "Header updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Delete header by ID
  static async deleteHeaderById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await HeaderService.deleteById(req.params.id);
      if (!result) return res.status(404).json(new ApiError(404, "Failed to delete header"));

      return res.status(200).json(new ApiResponse(200, result, "Header deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
