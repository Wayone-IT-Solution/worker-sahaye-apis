import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import BannerModel from "../../modals/banner.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import mongoose from "mongoose";
import { extractImageUrl } from "../community/community.controller";
import { Job } from "../../modals/job.model";
import { Community } from "../../modals/community.model";

const BannerService = new CommonService(BannerModel);

export class BannerController {
  // CREATE
  static async createBanner(req: Request, res: Response, next: NextFunction) {
    try {
      const image = req?.body?.image?.[0]?.url;
      if (!image)
        return res.status(403).json(new ApiError(403, "Banner Image is Required."));

      const { bannerType, job, community, othersUrl } = req.body;

      // Conditional validation
      if (bannerType === "job" && !job)
        return res.status(400).json(new ApiError(400, "Job ID is required for job banner."));
      if (bannerType === "community" && !community)
        return res.status(400).json(new ApiError(400, "Community ID is required for community banner."));
      if (bannerType === "other" && !othersUrl)
        return res.status(400).json(new ApiError(400, "othersUrl is required for other banner type."));

      const banner = await BannerService.create({ ...req.body, image });
      return res.status(201).json(new ApiResponse(201, banner, "Banner created successfully"));
    } catch (err) {
      next(err);
    }
  }

  // GET ALL
  static async getAllBanners(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const isAdmin = user?.role === "admin";
      const { usertype, ...restQuery } = req.query;

      const allBannersResult = await BannerService.getAll(restQuery);

      const allBanners = Array.isArray(allBannersResult)
        ? allBannersResult
        : allBannersResult.result || [];

      let filteredBanners = allBanners;

      if (usertype) {
        filteredBanners = filteredBanners.filter(
          (b: any) => b.userType === usertype
        );
      }

      if (!isAdmin) {
        filteredBanners = filteredBanners.filter(
          (b: any) => b.isActive === "active"
        );
      }

      // ✅ Populate job and community fields
      const populatedBanners = await Promise.all(
        filteredBanners.map(async (banner: any) => {
          const newBanner = { ...banner };

          if (banner.bannerType === "job" && banner.job) {
            // populate Job
            const job = await Job.findById(banner.job)
              .select(
                "title jobType status"
              )
              .lean();
            newBanner.job = job;
          }

          if (banner.bannerType === "community" && banner.community) {
            // populate Community
            const community = await Community.findById(banner.community)
              .select(
                "name type status shortDescription"
              )
              .lean();
            newBanner.community = community;
          }

          return newBanner;
        })
      );

      return res.status(200).json(
        new ApiResponse(200, {
          result: populatedBanners,
          pagination: !Array.isArray(allBannersResult)
            ? allBannersResult.pagination
            : {
              totalItems: populatedBanners.length,
              totalPages: 1,
              currentPage: 1,
              itemsPerPage: populatedBanners.length,
            },
        }, "Data fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  // GET BY ID
  static async getBannerById(req: Request, res: Response, next: NextFunction) {
    try {
      const banner = await BannerService.getById(req.params.id);
      return res.status(200).json(new ApiResponse(200, banner, "Data fetched successfully"));
    } catch (err: any) {
      if (err.message === "Record not found")
        return res.status(404).json(new ApiError(404, "Banner not found"));
      next(err);
    }
  }

  // UPDATE
  static async updateBannerById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const image = req?.body?.image?.[0]?.url;

      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json(new ApiError(400, "Invalid banner ID"));

      const record = await BannerService.getById(id);

      const { bannerType, job, community, othersUrl } = req.body;

      if (bannerType === "job" && !job)
        return res.status(400).json(new ApiError(400, "Job ID is required for job banner."));
      if (bannerType === "community" && !community)
        return res.status(400).json(new ApiError(400, "Community ID is required for community banner."));
      if (bannerType === "other" && !othersUrl)
        return res.status(400).json(new ApiError(400, "othersUrl is required for other banner type."));

      let imageUrl;
      if (req?.body?.image && record.image)
        imageUrl = await extractImageUrl(req?.body?.image, record.image as string);

      const updated = await BannerService.updateById(id, {
        ...req.body,
        image: imageUrl || image,
      });

      return res.status(200).json(new ApiResponse(200, updated, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  // DELETE
  static async deleteBannerById(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await BannerService.deleteById(req.params.id);
      return res.status(200).json(new ApiResponse(200, deleted, "Deleted successfully"));
    } catch (err: any) {
      if (err.message === "Record not found for delete")
        return res.status(404).json(new ApiError(404, "Banner not found"));
      next(err);
    }
  }
}
