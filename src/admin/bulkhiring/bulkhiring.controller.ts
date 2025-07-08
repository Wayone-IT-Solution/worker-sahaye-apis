import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { BulkHiringRequest } from "../../modals/bulkhiring.model";

const bulkHiringService = new CommonService(BulkHiringRequest);

export class BulkHiringController {
  static async createBulkHiring(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      if (!["employer", "contractor"].includes(role?.toLowerCase())) {
        return res
          .status(403)
          .json(
            new ApiError(403, "Only employers or contractors can create bulk hiring requests.")
          );
      }
      const existing = await BulkHiringRequest.findOne({
        userId,
        isActive: true,
        status: { $in: ["Pending", "In Review", "Assigned"] },
      });

      if (existing) {
        return res.status(200).json(
          new ApiResponse(200, existing, "You already have an active bulk hiring request.")
        );
      }
      const result = await bulkHiringService.create({ ...req.body, userId });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create bulk hiring"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllBulkHirings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const result = await bulkHiringService.getAll({ ...req.query, ...(role === "admin" ? {} : userId) });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getBulkHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await bulkHiringService.getById(req.params.id, true);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "bulk hiring not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateBulkHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await bulkHiringService.getById(id);
      if (!record)
        return res
          .status(404)
          .json(new ApiError(404, "Bulk hiring request not found"));

      const allowedStatuses = ["Pending", "In Review"];
      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot update request with status '${record.status}'. Allowed only in: ${allowedStatuses.join(", ")}`
          )
        );
      }
      const result = await bulkHiringService.updateById(id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update bulk hiring"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteBulkHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await bulkHiringService.getById(id);
      if (!record)
        return res
          .status(404)
          .json(new ApiError(404, "Bulk hiring request not found"));

      const allowedStatuses = ["Pending", "Cancelled"];
      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot delete request with status '${record.status}'. Allowed only in: ${allowedStatuses.join(", ")}`
          )
        );
      }
      const result = await bulkHiringService.deleteById(id);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
