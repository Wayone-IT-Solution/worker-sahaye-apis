import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import SubIndustry from "../../modals/subindustry.model";
import Industry from "../../modals/industry.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import {
  buildMatchStage,
  buildSortObject,
  buildPaginationResponse,
  SEARCH_FIELD_MAP,
} from "../../utils/queryBuilder";

const SubIndustryService = new CommonService(SubIndustry);

export class SubIndustryController {
  static async createSubIndustry(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { name, description, icon, industryId } = req.body;

      // Validation
      if (!name || !industryId) {
        return res.status(400).json({
          success: false,
          message: "Name and industryId are required",
        });
      }

      // Check if industry exists
      const industry = await Industry.findById(industryId);
      if (!industry) {
        return res.status(404).json({
          success: false,
          message: "Industry not found",
        });
      }

      // Check if sub-industry with same name already exists for this industry
      const existingSubIndustry = await SubIndustry.findOne({
        industryId,
        name: name.trim(),
      });

      if (existingSubIndustry) {
        return res.status(400).json({
          success: false,
          message: "Sub-industry with this name already exists for this industry",
        });
      }

      const data = {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        industryId,
        createdBy: (req as any).user?._id,
      };

      const result = await SubIndustryService.create(data);
      return res.status(201).json(
        new ApiResponse(201, result, "Sub-industry created successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAllSubIndustries(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const matchStage = buildMatchStage(
        {
          status: req.query.status as string,
          search: req.query.search as string,
          searchKey: req.query.searchKey as string,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          industryId: req.query.industryId as string,
        },
        SEARCH_FIELD_MAP.subindustry
      );

      const sortObj = buildSortObject(
        req.query.sortKey as string,
        req.query.sortDir as string
      );

      const total = await SubIndustry.countDocuments(matchStage);
      const subIndustries = await SubIndustry.find(matchStage)
        .populate("industryId", "name icon description")
        .populate("createdBy updatedBy", "name email")
        .sort(sortObj)
        .skip(skip)
        .limit(limit);

      return res.status(200).json(
        new ApiResponse(
          200,
          buildPaginationResponse(subIndustries, total, page, limit),
          "Sub-industries fetched successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  }

  static async getSubIndustryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await SubIndustry.findById(req.params.id)
        .populate("industryId", "name icon description")
        .populate("createdBy updatedBy", "name email");
      if (!result) {
        return res.status(404).json(
          new ApiError(404, "Sub-industry not found")
        );
      }
      return res.status(200).json(
        new ApiResponse(200, result, "Sub-industry fetched successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateSubIndustry(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = { ...req.body, updatedBy: (req as any).user?._id };
      const result = await SubIndustryService.updateById(req.params.id, data);

      if (!result) {
        return res.status(404).json(
          new ApiError(404, "Sub-industry not found")
        );
      }

      return res.status(200).json(
        new ApiResponse(200, result, "Sub-industry updated successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteSubIndustry(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await SubIndustryService.deleteById(req.params.id);

      if (!result) {
        return res.status(404).json(
          new ApiError(404, "Sub-industry not found")
        );
      }

      return res.status(200).json(
        new ApiResponse(200, result, "Sub-industry deleted successfully")
      );
    } catch (error) {
      next(error);
    }
  }
}

// Export functions for backward compatibility
export const createSubIndustry = SubIndustryController.createSubIndustry;
export const getAllSubIndustries = SubIndustryController.getAllSubIndustries;
export const getSubIndustryById = SubIndustryController.getSubIndustryById;
export const updateSubIndustry = SubIndustryController.updateSubIndustry;
export const deleteSubIndustry = SubIndustryController.deleteSubIndustry;

// Get all sub-industries for a specific industry
export const getSubIndustriesByIndustry = async (req: Request, res: Response) => {
  try {
    const { industryId } = req.params;
    const status = req.query.status as string;

    if (!industryId) {
      return res.status(400).json({
        success: false,
        message: "industryId is required",
      });
    }

    // Check if industry exists
    const industry = await Industry.findById(industryId);
    if (!industry) {
      return res.status(404).json({
        success: false,
        message: "Industry not found",
      });
    }

    const matchStage: any = { industryId };
    if (status) {
      matchStage.status = status;
    }

    const subIndustries = await SubIndustry.find(matchStage)
      .populate("industryId", "name icon")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Sub-industries fetched successfully",
      data: subIndustries,
      count: subIndustries.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching sub-industries",
    });
  }
};
