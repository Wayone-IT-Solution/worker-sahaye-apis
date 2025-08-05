import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { ComplianceCalendar } from "../../modals/compliancecalendar.model";
import { extractImageUrl } from "../../admin/community/community.controller";

const complianceCalenderService = new CommonService(ComplianceCalendar);

export class ComplianceCalendarController {
  static async createComplianceCalendar(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const document = req?.body?.document?.[0]?.url;

      if (typeof req.body.tags === "string")
        req.body.tags = req.body.tags.split(",");
      const result = await complianceCalenderService.create({
        ...req.body,
        document: document ?? "",
      });
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create compliance Calender"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllComplianceCalendars(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const result = await complianceCalenderService.getAll({
        ...req.query,
        ...(role === "admin" ? {} : userId),
      });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getComplianceCalendarById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await complianceCalenderService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Compliance Calender not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateComplianceCalendarById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const document = req?.body?.document?.[0]?.url;

      if (!mongoose.Types.ObjectId.isValid(id))
        return res
          .status(400)
          .json(new ApiError(400, "Invalid compliance calender doc ID"));

      const record = await complianceCalenderService.getById(id);
      if (!record) {
        if (document) {
          const s3Key = document.split(".com/")[1];
          await deleteFromS3(s3Key);
        }
        return res
          .status(404)
          .json(new ApiError(404, "Calender Compliance not found."));
      }

      let jobDescriptionUrl;
      if (req?.body?.document && record.document) {
        jobDescriptionUrl = await extractImageUrl(
          req?.body?.document,
          record.document as string
        );
      }
      if (typeof req.body.tags === "string")
        req.body.tags = req.body.tags.split(",");
      const result = await complianceCalenderService.updateById(id, {
        ...req.body,
        document: jobDescriptionUrl || document,
      });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to update Calender Compliance."));
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Calender Compliance updated successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async deleteComplianceCalendarById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await complianceCalenderService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete compliance calender"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
