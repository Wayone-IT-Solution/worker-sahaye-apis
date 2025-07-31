import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { Salesperson } from "../../modals/salesperson.model";
import { CommonService } from "../../services/common.services";

const SalesPersonService = new CommonService(Salesperson);

export class SalesPersonController {
  static async createSalesPerson(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const duplicate = await Salesperson.findOne({
        $or: [
          { email: req.body.email },
          { mobile: req.body.mobile },
          { name: req.body.name }
        ]
      });

      if (duplicate) {
        return res
          .status(409)
          .json(new ApiError(409, "sales person with same name, email, or mobile already exists."));
      }
      const result = await SalesPersonService.create(req.body);
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create sales person profile"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "sales person created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllSalesPersons(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const result = await SalesPersonService.getAll({ ...req.query, ...(role === "admin" ? {} : userId) });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getSalesPersonById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await SalesPersonService.getById(req.params.id, false);
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

  static async updateSalesPersonById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;

      const record = await SalesPersonService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "sales person profile not found."));
      }

      const result = await SalesPersonService.updateById(id, req.body);
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to update sales person profile."));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "sales person profile updated successfully."));
    } catch (err) {
      next(err);
    }
  }

  static async deleteSalesPersonById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await SalesPersonService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "sales person profile not found."));
      }

      // ✅ Optional: prevent deletion if it's still marked active
      if (record.isActive) {
        return res
          .status(400)
          .json(new ApiError(400, "Please deactivate the profile before deleting."));
      }

      const result = await SalesPersonService.deleteById(id);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "sales person profile deleted successfully."));
    } catch (err) {
      next(err);
    }
  }
}
