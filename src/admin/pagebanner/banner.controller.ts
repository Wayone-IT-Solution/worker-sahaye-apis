import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import PageBannerModel from "../../modals/multibanner.model";
import { CommonService } from "../../services/common.services";

const BannerService = new CommonService(PageBannerModel);

export class BannerController {
  static async createBanner(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { image } = req?.body;
      if (image?.length === 0) return res.status(403).json(new ApiError(403, "Banner Image is Required."));
      const result = await BannerService.create({
        ...req.body,
        image: image?.map((file: any, index: number) => ({
          order: index,
          url: file.url,
          s3Key: file.url.split(".com/")[1],
        })),
      });
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
      const { role } = (req as any).user;
      const result = await BannerService.getAll({ ...req.query, ...(role === "admin" ? {} : { userType: role }) });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
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
      const { image } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(new ApiError(400, "Invalid banner doc ID"));
      }

      const updatedImages =
        Array.isArray(image) && image.length > 0
          ? image
            .filter((file: any) => typeof file === "object" && file !== null)
            .map((file: any, index: number) => ({
              order: index,
              url: file.url,
              s3Key: file.url?.split(".com/")[1], // ✅ safe access
            }))
          : [];

      const record = await BannerService.getById(id);
      if (!record) {
        return res.status(404).json(new ApiError(404, "Banner not found."));
      }

      // Ensure record.image is always an array
      const existingImages = Array.isArray(record.image) ? record.image : [];

      const result = await BannerService.updateById(id, {
        ...req.body,
        image: [...existingImages, ...updatedImages],
      });

      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update banner"));
      }

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

  static async deleteImageBannerById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { key: s3Key } = req.body;
      const result: any = await PageBannerModel.findOne({ _id: id });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete banner"));

      const exists = result?.image.find((att: any) => att.s3Key === s3Key)?.url;
      if (!exists) await deleteFromS3(s3Key);

      result.image = result?.image.filter((att: any) => att.s3Key !== s3Key);
      await result.save();
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
