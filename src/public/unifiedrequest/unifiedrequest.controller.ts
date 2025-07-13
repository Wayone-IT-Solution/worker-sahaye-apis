import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { UnifiedServiceRequest } from "../../modals/unifiedrequest.model";
import { extractImageUrl } from "../../admin/community/community.controller";

const unifiedRequestService = new CommonService(UnifiedServiceRequest);

export class UnifiedRequestController {
  static async createUnifiedRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const jobDescriptionUrl = req?.body?.document?.[0]?.url;

      // ✅ Only "employer" or "contractor" allowed
      if (!["employer", "contractor"].includes(role?.toLowerCase())) {
        const s3Key = jobDescriptionUrl.split(".com/")[1];
        await deleteFromS3(s3Key);
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              "Only employers or contractors can create Unified service request."
            )
          );
      }

      // ✅ Prevent duplicate active Unified service request
      const existing = await UnifiedServiceRequest.findOne({
        userId,
        isActive: true,
        status: { $in: ["Pending", "Assigned", "In Progress"] },
      });

      if (existing) {
        if (jobDescriptionUrl) {
          const s3Key = jobDescriptionUrl.split(".com/")[1];
          await deleteFromS3(s3Key);
        }
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              existing,
              "You already have an active Unified Service Request."
            )
          );
      }

      // ✅ Create new Unified Service Request
      const result = await unifiedRequestService.create({
        ...req.body,
        userId,
        document: jobDescriptionUrl,
      });

      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Unified Service Request"));
      }

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            "Unified Service Request created successfully"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllUnifiedRequests(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const result = await unifiedRequestService.getAll({
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

  static async getUnifiedRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await unifiedRequestService.getById(req.params.id, true);
      if (!result)
        return res.status(404).json(new ApiError(404, "bulk hiring not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateUnifiedRequestById(
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
          .json(new ApiError(400, "Invalid police verification doc ID"));

      const record = await unifiedRequestService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Unified Service Request not found."));
      }

      // ✅ Only allow update if status is PENDING or IN_PROGRESS
      const allowedStatuses = ["Pending", "In Progress"];
      if (!allowedStatuses.includes(record.status)) {
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              `Cannot update request with status '${
                record.status
              }'. Allowed statuses: ${allowedStatuses.join(", ")}.`
            )
          );
      }

      let jobDescriptionUrl;
      if (req?.body?.document && record.document) {
        jobDescriptionUrl = await extractImageUrl(
          req?.body?.document,
          record.document as string
        );
      }
      const result = await unifiedRequestService.updateById(id, {
        ...req.body,
        document: jobDescriptionUrl || document,
      });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to update Unified Service Request."));
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Unified Service Request updated successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async deleteUnifiedRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await unifiedRequestService.getById(id);

      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Unified Service Request not found."));
      }

      // ✅ Only allow deletion if it's inactive and in cancellable state
      const allowedStatuses = ["Pending", "Cancelled"];
      if (record.isActive) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Please deactivate the request before deletion.")
          );
      }

      if (!allowedStatuses.includes(record.status)) {
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              `Cannot delete request with status '${
                record.status
              }'. Allowed statuses: ${allowedStatuses.join(", ")}.`
            )
          );
      }

      const result = await unifiedRequestService.deleteById(id);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Unified Service Request deleted successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }
}
