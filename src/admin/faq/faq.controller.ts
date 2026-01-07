import ApiError from "../../utils/ApiError";
import { Faq } from "../../modals/faq.model";
import { FaqCategory } from "../../modals/faqcategory.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import mongoose from "mongoose";

const faqService = new CommonService(Faq);
const faqCategoryService = new CommonService(FaqCategory);

export class FaqController {
  /**
   * ✅ ADMIN CRUD Operations for FAQs
   */

  static async createFaq(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { question, answer, category, visibilityFor, pageSlug, isActive } = req.body;

      // Validate required fields
      if (!question || !answer || !category) {
        return res
          .status(400)
          .json(new ApiError(400, "Question, Answer, and Category are required"));
      }

      // Validate category exists
      const categoryExists = await faqCategoryService.getById(category, false);
      if (!categoryExists) {
        return res
          .status(404)
          .json(new ApiError(404, "Category not found"));
      }

      const faqData = {
        question,
        answer,
        category,
        visibilityFor: visibilityFor || "all",
        pageSlug,
        isActive: isActive !== undefined ? isActive : true,
      };

      const result = await faqService.create(faqData);
      return res
        .status(201)
        .json(new ApiResponse(201, result, "FAQ created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllFaqsAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await faqService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "FAQs fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getFaqById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json(new ApiError(400, "Invalid FAQ ID"));
      }

      const result = await faqService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "FAQ not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "FAQ fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateFaqById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json(new ApiError(400, "Invalid FAQ ID"));
      }

      // Validate category if being updated
      if (req.body.category) {
        const categoryExists = await faqCategoryService.getById(req.body.category, false);
        if (!categoryExists) {
          return res
            .status(404)
            .json(new ApiError(404, "Category not found"));
        }
      }

      const result = await faqService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update FAQ"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "FAQ updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteFaqById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json(new ApiError(400, "Invalid FAQ ID"));
      }

      const result = await faqService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete FAQ"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "FAQ deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * ✅ ADMIN CRUD Operations for FAQ Categories
   */

  static async createFaqCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res
          .status(400)
          .json(new ApiError(400, "Category name is required"));
      }

      const categoryData = { name, description };
      const result = await faqCategoryService.create(categoryData);

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
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json(new ApiError(400, "Invalid Category ID"));
      }

      const result = await faqCategoryService.getById(req.params.id);
      if (!result) {
        return res.status(404).json(new ApiError(404, "FAQ Category not found"));
      }

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
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json(new ApiError(400, "Invalid Category ID"));
      }

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
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json(new ApiError(400, "Invalid Category ID"));
      }

      // Check if any FAQs use this category
      const faqCount = await Faq.countDocuments({ category: req.params.id });
      if (faqCount > 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Cannot delete category that has FAQs"));
      }

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

  /**
   * ✅ USER VIEW Operations (with filtering by user type)
   */

  static async getUserFaqs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userType, page = 1, limit = 10, sortKey = "createdAt", sortDir = "desc" } = req.query;
      
      // Build filter query - get all active FAQs first
      let filter: any = { isActive: true };

      // Apply visibility filter based on userType
      if (userType && userType !== "all") {
        // Show FAQs that are visible to "all" OR to the specific user type
        filter.$or = [
          { visibilityFor: "all" },
          { visibilityFor: userType }
        ];
      } else {
        // If userType is "all" or not provided, show only "all" visibility FAQs
        filter.visibilityFor = "all";
      }

      // Parse pagination parameters
      const pageNumber = Math.max(parseInt(page as string, 10) || 1, 1);
      const limitNumber = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skipCount = (pageNumber - 1) * limitNumber;

      // Parse sort parameters
      const sortObj: any = {};
      sortObj[sortKey as string] = sortDir === "asc" ? 1 : -1;

      // Get total count for pagination
      const totalItems = await Faq.countDocuments(filter);
      const totalPages = Math.ceil(totalItems / limitNumber);

      // Populate category details with pagination
      const result = await Faq.find(filter)
        .populate("category", "name description")
        .sort(sortObj)
        .skip(skipCount)
        .limit(limitNumber)
        .lean();

      const response = {
        result,
        pagination: {
          totalItems,
          totalPages,
          currentPage: pageNumber,
          itemsPerPage: limitNumber,
        },
      };

      return res
        .status(200)
        .json(new ApiResponse(200, response, "FAQs fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get FAQ by ID for user view (checks visibility)
   */
  static async getUserFaqById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userType } = req.query;
      const faqId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(faqId)) {
        return res.status(400).json(new ApiError(400, "Invalid FAQ ID"));
      }

      // Find FAQ with visibility check
      let filter: any = { _id: faqId, isActive: true };

      if (userType && userType !== "all") {
        filter.$or = [
          { visibilityFor: "all" },
          { visibilityFor: userType }
        ];
      } else {
        filter.visibilityFor = "all";
      }

      const result = await Faq.findOne(filter)
        .populate("category", "name description")
        .lean();

      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "FAQ not found or not visible to you"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "FAQ fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get FAQs by category for user view
   */
  static async getUserFaqsByCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { categoryId } = req.params;
      const { userType, page = 1, limit = 10, sortKey = "createdAt", sortDir = "desc" } = req.query;

      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json(new ApiError(400, "Invalid Category ID"));
      }

      // Build filter query
      let filter: any = { category: categoryId, isActive: true };

      if (userType && userType !== "all") {
        filter.$or = [
          { visibilityFor: "all" },
          { visibilityFor: userType }
        ];
      } else {
        filter.visibilityFor = "all";
      }

      // Parse pagination parameters
      const pageNumber = Math.max(parseInt(page as string, 10) || 1, 1);
      const limitNumber = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skipCount = (pageNumber - 1) * limitNumber;

      // Parse sort parameters
      const sortObj: any = {};
      sortObj[sortKey as string] = sortDir === "asc" ? 1 : -1;

      // Get total count for pagination
      const totalItems = await Faq.countDocuments(filter);
      const totalPages = Math.ceil(totalItems / limitNumber);

      // Populate category details with pagination
      const result = await Faq.find(filter)
        .populate("category", "name description")
        .sort(sortObj)
        .skip(skipCount)
        .limit(limitNumber)
        .lean();

      const response = {
        result,
        pagination: {
          totalItems,
          totalPages,
          currentPage: pageNumber,
          itemsPerPage: limitNumber,
        },
      };

      return res
        .status(200)
        .json(new ApiResponse(200, response, "FAQs fetched successfully"));
    } catch (err) {
      next(err);
    }
  }
}

