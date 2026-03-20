import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import EducationField from "../../modals/educationfield.model";
import Education from "../../modals/education.model";
import mongoose from "mongoose";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import {
  buildMatchStage,
  buildSortObject,
  buildPaginationResponse,
  SEARCH_FIELD_MAP,
} from "../../utils/queryBuilder";
import { EducationFieldStatus } from "../../modals/educationfield.model";
import { normalizePayloadToArray } from "../../utils/payloadSanitizer";

const EducationFieldService = new CommonService(EducationField);
const VALID_EDUCATION_FIELD_STATUS = new Set(Object.values(EducationFieldStatus));
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class EducationFieldController {
  private static async resolveEducationId(input: unknown): Promise<string | null> {
    if (input === null || input === undefined) return null;

    if (typeof input === "object" && !Array.isArray(input)) {
      const candidate = (input as any)?._id
        ?? (input as any)?.id
        ?? (input as any)?.name
        ?? (input as any)?.title
        ?? (input as any)?.label;
      return EducationFieldController.resolveEducationId(candidate);
    }

    const value = String(input).trim();
    if (!value) return null;

    if (mongoose.Types.ObjectId.isValid(value)) {
      const exists = await Education.exists({ _id: value });
      if (exists) return value;
    }

    const byName = await Education.findOne(
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

  static async createEducationField(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const items = normalizePayloadToArray(req.body);
      if (!items.length) {
        return res.status(400).json({
          success: false,
          message: "Name and educationId are required",
        });
      }

      const createdBy = (req as any).user?.id;
      const normalizedPayload: Array<Record<string, unknown>> = [];

      for (let index = 0; index < items.length; index += 1) {
        const row = (items[index] ?? {}) as Record<string, unknown>;
        const rowNumber = index + 1;
        const name = String(row?.name ?? "").trim();
        const educationInput =
          row?.educationId
          ?? row?.["educationId.name"]
          ?? row?.["educationId.title"]
          ?? row?.["educationId.label"]
          ?? row?.educationName
          ?? row?.["education.name"];

        const educationId = await EducationFieldController.resolveEducationId(educationInput);
        if (!name || !educationId) {
          return res.status(400).json({
            success: false,
            message:
              items.length > 1
                ? `Row ${rowNumber}: Name and educationId are required`
                : "Name and educationId are required",
          });
        }

        const existingField = await EducationField.findOne({
          educationId,
          name,
        });

        if (existingField) {
          return res.status(400).json({
            success: false,
            message:
              items.length > 1
                ? `Row ${rowNumber}: Field with this name already exists for this education`
                : "Field with this name already exists for this education",
          });
        }

        const statusRaw = String(row?.status ?? EducationFieldStatus.ACTIVE)
          .trim()
          .toLowerCase();
        const status = VALID_EDUCATION_FIELD_STATUS.has(statusRaw as EducationFieldStatus)
          ? (statusRaw as EducationFieldStatus)
          : EducationFieldStatus.ACTIVE;

        const normalizedOrder =
          row?.order !== undefined &&
          row?.order !== null &&
          String(row.order).trim() !== "" &&
          Number.isFinite(Number(row.order))
            ? Number(row.order)
            : 0;

        normalizedPayload.push({
          name,
          status,
          educationId,
          createdBy,
          order: normalizedOrder,
          description: row?.description ? String(row.description).trim() : null,
        });
      }

      const result = Array.isArray(req.body)
        ? await EducationField.insertMany(normalizedPayload)
        : await EducationFieldService.create(normalizedPayload[0] as any);

      return res.status(201).json(
        new ApiResponse(
          201,
          result,
          Array.isArray(req.body)
            ? `${(result as any[])?.length || normalizedPayload.length} education fields created successfully`
            : "Education field created successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAllEducationFields(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const isAuthenticatedRequest = Boolean((req as any).user?.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const educationId = req.query.educationId as string;
      const statusQuery = req.query.status as string | undefined;
      const effectiveStatus =
        !isAuthenticatedRequest && !statusQuery ? "active" : statusQuery;

      let matchStage = buildMatchStage(
        {
          status: effectiveStatus,
          search: req.query.search as string,
          searchKey: req.query.searchKey as string,
        },
        SEARCH_FIELD_MAP.educationfield
      );

      const sortObj = buildSortObject(
        req.query.sortKey as string,
        req.query.sortDir as string
      );

      // If educationId is provided, filter by it
      if (educationId && mongoose.Types.ObjectId.isValid(educationId)) {
        matchStage.educationId = new mongoose.Types.ObjectId(educationId);
      }

      const pipeline: any[] = [
        {
          $lookup: {
            from: "educations",
            localField: "educationId",
            foreignField: "_id",
            as: "educationDetails",
          },
        },
        {
          $unwind: {
            path: "$educationDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        { $match: matchStage },
        { $sort: sortObj },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            name: 1,
            order: 1,
            description: 1,
            educationId: "$educationDetails",
            status: 1,
            createdBy: 1,
            updatedBy: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ];

      const data = await EducationField.aggregate(pipeline);
      const totalCount = await EducationField.countDocuments(matchStage);

      const pagination = buildPaginationResponse(data, totalCount, page, limit);

      return res.status(200).json(
        new ApiResponse(
          200,
          { result: data, pagination },
          "Education fields fetched successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getEducationFieldById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await EducationFieldService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "Education field not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Education field fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateEducationField(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = { ...req.body, updatedBy: (req as any).user?.id };
      const result = await EducationFieldService.updateById(req.params.id, data);

      if (!result) {
        return res.status(404).json(
          new ApiError(404, "Education field not found")
        );
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Education field updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteEducationField(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await EducationFieldService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Education field not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Education field deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}

export const createEducationField = EducationFieldController.createEducationField;
export const getAllEducationFields = EducationFieldController.getAllEducationFields;
export const getEducationFieldById = EducationFieldController.getEducationFieldById;
export const updateEducationField = EducationFieldController.updateEducationField;
export const deleteEducationField = EducationFieldController.deleteEducationField;
