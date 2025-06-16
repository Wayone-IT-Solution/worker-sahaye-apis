import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import FileUpload from "../../modals/fileupload.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const fileUploadService = new CommonService(FileUpload);

export class FileUploadController {
  static async createFileUpload(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await fileUploadService.create(req.body);
      if (!result) throw new ApiError(400, "Failed to create worker category");
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllFileUploads(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await fileUploadService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getFileUploadById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await fileUploadService.getById(req.params.id);
      if (!result) throw new ApiError(404, "Worker category not found");
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateFileUploadById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await fileUploadService.updateById(
        req.params.id,
        req.body
      );
      if (!result) throw new ApiError(404, "Failed to update worker category");
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteFileUploadById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await fileUploadService.deleteById(req.params.id);
      if (!result) throw new ApiError(404, "Failed to delete worker category");
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
