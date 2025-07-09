import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { VirtualHRRequest } from "../../modals/virtualhrrequest.model";
import { extractImageUrl } from "../../admin/community/community.controller";

const virtualHRRequestService = new CommonService(VirtualHRRequest);

export class VirtualHRRequestController {
  static async createVirtualHRRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const jobDescriptionUrl = req?.body?.jobDescriptionUrl?.[0]?.url;

      // ✅ Only "employer" or "contractor" allowed
      if (!["employer", "contractor"].includes(role?.toLowerCase())) {
        const s3Key = jobDescriptionUrl.split(".com/")[1];
        await deleteFromS3(s3Key);
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              "Only employers or contractors can create Virtual HR requests."
            )
          );
      }

      // ✅ Prevent duplicate active Virtual HR requests
      const existing = await VirtualHRRequest.findOne({
        userId,
        isActive: true,
        status: { $in: ["Pending", "Assigned", "In Progress"] }
      });

      if (existing) {
        if (jobDescriptionUrl) {
          const s3Key = jobDescriptionUrl.split(".com/")[1];
          await deleteFromS3(s3Key);
        }
        return res.status(200).json(
          new ApiResponse(
            200,
            existing,
            "You already have an active Virtual HR request."
          )
        );
      }

      // ✅ Create new Virtual HR request
      const result = await virtualHRRequestService.create({
        ...req.body, userId, jobDescriptionUrl
      });

      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Virtual HR request"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Virtual HR request created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllVirtualHRRequests(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const result = await virtualHRRequestService.getAll({ ...req.query, ...(role === "admin" ? {} : userId) });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getVirtualHRRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await virtualHRRequestService.getById(req.params.id, true);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "bulk hiring not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateVirtualHRRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const document = req?.body?.jobDescriptionUrl?.[0]?.url;

      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json(new ApiError(400, "Invalid police verification doc ID"));

      const record = await virtualHRRequestService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Virtual HR request not found."));
      }

      // ✅ Only allow update if status is PENDING or IN_PROGRESS
      const allowedStatuses = ["Pending", "In Progress"];
      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot update request with status '${record.status}'. Allowed statuses: ${allowedStatuses.join(", ")}.`
          )
        );
      }

      let jobDescriptionUrl;
      if (req?.body?.jobDescriptionUrl && record.jobDescriptionUrl) {
        jobDescriptionUrl = await extractImageUrl(req?.body?.jobDescriptionUrl, record.jobDescriptionUrl as string);
      }
      const result = await virtualHRRequestService.updateById(id, { ...req.body, jobDescriptionUrl });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to update Virtual HR request."));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Virtual HR request updated successfully."));
    } catch (err) {
      next(err);
    }
  }

  static async deleteVirtualHRRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await virtualHRRequestService.getById(id);

      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Virtual HR request not found."));
      }

      // ✅ Only allow deletion if it's inactive and in cancellable state
      const allowedStatuses = ["Pending", "Cancelled"];
      if (record.isActive) {
        return res
          .status(400)
          .json(new ApiError(400, "Please deactivate the request before deletion."));
      }

      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot delete request with status '${record.status}'. Allowed statuses: ${allowedStatuses.join(", ")}.`
          )
        );
      }

      const result = await virtualHRRequestService.deleteById(id);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Virtual HR request deleted successfully."));
    } catch (err) {
      next(err);
    }
  }
}
