import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import SubIndustry from "../../modals/subindustry.model";
import Industry from "../../modals/industry.model";
import mongoose from "mongoose";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import {
  buildMatchStage,
  buildSortObject,
  buildPaginationResponse,
  SEARCH_FIELD_MAP,
} from "../../utils/queryBuilder";
import { SubIndustryStatus } from "../../modals/subindustry.model";

const SubIndustryService = new CommonService(SubIndustry);
const VALID_SUB_INDUSTRY_STATUS = new Set(Object.values(SubIndustryStatus));
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class SubIndustryController {
  private static async resolveIndustryId(input: unknown): Promise<string | null> {
    if (input === null || input === undefined) return null;

    if (typeof input === "object" && !Array.isArray(input)) {
      const candidate = (input as any)?._id
        ?? (input as any)?.id
        ?? (input as any)?.name
        ?? (input as any)?.title
        ?? (input as any)?.label
        ?? (input as any)?.code;
      return SubIndustryController.resolveIndustryId(candidate);
    }

    const value = String(input).trim();
    if (!value) return null;

    if (mongoose.Types.ObjectId.isValid(value)) {
      const exists = await Industry.exists({ _id: value });
      if (exists) return value;
    }

    const byName = await Industry.findOne(
      {
        name: {
          $regex: new RegExp(`^${escapeRegex(value)}$`, "i"),
        },
      },
      { _id: 1 }
    );

    if (byName?._id) return String(byName._id);
    return null;
  }

  static async createSubIndustry(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const items = Array.isArray(req.body) ? req.body : [req.body];
      if (!items.length) {
        return res.status(400).json({
          success: false,
          message: "Name and industryId are required",
        });
      }

      const createdBy = (req as any).user?._id;
      const normalizedPayload: Array<Record<string, unknown>> = [];

      for (let index = 0; index < items.length; index += 1) {
        const row = (items[index] ?? {}) as Record<string, unknown>;
        const rowNumber = index + 1;
        const name = String(row?.name ?? "").trim();
        const industryInput =
          row?.industryId
          ?? row?.["industryId.name"]
          ?? row?.["industryId.title"]
          ?? row?.["industryId.label"]
          ?? row?.industryName
          ?? row?.["industry.name"];

        const industryId = await SubIndustryController.resolveIndustryId(industryInput);
        if (!name || !industryId) {
          return res.status(400).json({
            success: false,
            message:
              items.length > 1
                ? `Row ${rowNumber}: Name and industryId are required`
                : "Name and industryId are required",
          });
        }

        const existingSubIndustry = await SubIndustry.findOne({
          industryId,
          name,
        });

        if (existingSubIndustry) {
          return res.status(400).json({
            success: false,
            message:
              items.length > 1
                ? `Row ${rowNumber}: Sub-industry with this name already exists for this industry`
                : "Sub-industry with this name already exists for this industry",
          });
        }

        const statusRaw = String(row?.status ?? SubIndustryStatus.ACTIVE)
          .trim()
          .toLowerCase();
        const status = VALID_SUB_INDUSTRY_STATUS.has(statusRaw as SubIndustryStatus)
          ? (statusRaw as SubIndustryStatus)
          : SubIndustryStatus.ACTIVE;

        normalizedPayload.push({
          name,
          status,
          industryId,
          createdBy,
          icon: row?.icon ? String(row.icon).trim() : null,
          description: row?.description ? String(row.description).trim() : null,
        });
      }

      const result = Array.isArray(req.body)
        ? await SubIndustry.insertMany(normalizedPayload)
        : await SubIndustryService.create(normalizedPayload[0] as any);

      return res.status(201).json(
        new ApiResponse(
          201,
          result,
          Array.isArray(req.body)
            ? `${(result as any[])?.length || normalizedPayload.length} sub-industries created successfully`
            : "Sub-industry created successfully"
        )
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
