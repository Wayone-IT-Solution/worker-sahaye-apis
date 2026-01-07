import ApiError from "../../utils/ApiError";
import { FaqCategory } from "../../modals/faqcategory.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const faqCategoryService = new CommonService(FaqCategory);

export class FaqCategoryController {
  static async createFaqCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await faqCategoryService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create FAQ Category"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "FAQ Category created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllFaqCategories(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await faqCategoryService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "FAQ Categories fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getFaqCategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await faqCategoryService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "FAQ Category not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "FAQ Category fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateFaqCategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await faqCategoryService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update FAQ Category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "FAQ Category updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteFaqCategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await faqCategoryService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete FAQ Category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "FAQ Category deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
