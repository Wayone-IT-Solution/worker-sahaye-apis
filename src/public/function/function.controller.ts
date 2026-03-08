import ApiError from "../../utils/ApiError";
import Function from "../../modals/function.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const FunctionService = new CommonService(Function);

export class PublicFunctionController {
  static async getActiveFunctions(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const query: any = {
        status: "active",
        pagination: false,
      };

      // Allow optional departmentId filter
      if (req.query.departmentId) {
        query.departmentId = req.query.departmentId;
      }

      // Allow optional limit
      if (req.query.limit) {
        query.limit = parseInt(req.query.limit as string, 10);
      }

      const pipelineOpts = { sort: { order: 1, name: 1 } } as any;
      const result = await FunctionService.getAll(query, pipelineOpts);
      return res
        .status(200)
        .json(
          new ApiResponse(200, result, "Active functions fetched successfully"),
        );
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
}

export default PublicFunctionController;
