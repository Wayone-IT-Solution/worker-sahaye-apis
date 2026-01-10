import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Header, IHeader } from "../../modals/header.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import mongoose from "mongoose";
import {
  buildMatchStage,
  buildSortObject,
  buildPaginationResponse,
  SEARCH_FIELD_MAP,
} from "../../utils/queryBuilder";

const HeaderService = new CommonService<IHeader>(Header);

export class HeaderController {
  // Create header with icon
  static async createHeader(req: Request, res: Response, next: NextFunction) {
    try {
    //   const iconUrl = req?.body?.icon?.[0]?.url;
    //   if (!iconUrl)
    //     return res.status(403).json(new ApiError(403, "Header icon is required."));

      const result = await HeaderService.create({ ...req.body });
      if (!result)
        return res.status(400).json(new ApiError(400, "Failed to create header"));

      return res.status(201).json(new ApiResponse(201, result, "Header created successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Get all headers
  static async getAllHeaders(req: Request, res: Response, next: NextFunction) {
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
        },
        SEARCH_FIELD_MAP.header
      );

      const sortObj = buildSortObject(
        req.query.sortKey as string,
        req.query.sortDir as string
      );

      const total = await Header.countDocuments(matchStage);
      const headers = await Header.find(matchStage)
        .sort(sortObj)
        .skip(skip)
        .limit(limit);

      return res.status(200).json(
        new ApiResponse(
          200,
          buildPaginationResponse(headers, total, page, limit),
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
    //   if (!mongoose.Types.ObjectId.isValid(id))
    //     return res.status(400).json(new ApiError(400, "Invalid Header ID"));

      const record = await HeaderService.getById(id);
      if (!record)
        return res.status(404).json(new ApiError(404, "Header not found"));

    //   const iconUrl = req?.body?.icon?.[0]?.url || record.icon;

      const result = await HeaderService.updateById(id, {
        ...req.body,
        // icon: iconUrl,
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
