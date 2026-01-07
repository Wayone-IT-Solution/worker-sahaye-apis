import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import BannerModel from "../../modals/banner.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import mongoose from "mongoose";
import { extractImageUrl } from "../community/community.controller";

const BannerService = new CommonService(BannerModel);

export class BannerController {
  static async createBanner(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const image = req?.body?.image?.[0]?.url;
      if (!image) return res.status(403).json(new ApiError(403, "Banner Image is Required."));
      const result = await BannerService.create({ ...req.body, image });
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create banner"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllBanners(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = (req as any).user;
      const isAdmin = user?.role === "admin";
      const { usertype, ...restQuery } = req.query;
      
      // Get all banners first
      const allBannersResult = await BannerService.getAll(restQuery);
      
      // Extract result array
      const allBanners = Array.isArray(allBannersResult) 
        ? allBannersResult 
        : (allBannersResult.result || []);
      
      // Apply filters in controller
      let filteredBanners = allBanners;
      
      // Filter by userType if provided
      if (usertype) {
        filteredBanners = filteredBanners.filter(
          (banner: any) => banner.userType === usertype
        );
      }
      
      // Filter by isActive if not admin
      if (!isAdmin) {
        filteredBanners = filteredBanners.filter(
          (banner: any) => banner.isActive === "active"
        );
      }
      
      // Return formatted response
      const response = {
        result: filteredBanners,
        pagination: !Array.isArray(allBannersResult) 
          ? allBannersResult.pagination 
          : {
              totalItems: filteredBanners.length,
              totalPages: 1,
              currentPage: 1,
              itemsPerPage: filteredBanners.length,
            }
      };
      
      return res
        .status(200)
        .json(new ApiResponse(200, response, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getBannerById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await BannerService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "banner not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateBannerById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const image = req?.body?.image?.[0]?.url;
      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json(new ApiError(400, "Invalid banner doc ID"));

      const record = await BannerService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Banner not found."));
      }

      let imageUrl;
      if (req?.body?.image && record.image)
        imageUrl = await extractImageUrl(req?.body?.image, record.image as string);

      const result = await BannerService.updateById(
        req.params.id,
        { ...req.body, image: imageUrl || image }
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update banner"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteBannerById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await BannerService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete banner"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
