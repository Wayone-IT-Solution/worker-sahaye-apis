import ApiError from "../../utils/ApiError";
import { Badge } from "../../modals/badge.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { TopRecruiter } from "../../modals/toprecruiter.model";
import { FastResponder } from "../../modals/fastresponder.model";
import { ReliablePayer } from "../../modals/reliablepayer.model";
import { SafeWorkplace } from "../../modals/safeworkplace.model";
import { TrainedWorker } from "../../modals/trainedworker.model";
import { PreInterviewed } from "../../modals/preinterviewd.model";
import { TrustedPartner } from "../../modals/trustedpartner.model";
import { HighlyPreferred } from "../../modals/highlypreferred.model";
import { SkilledCandidate } from "../../modals/skilledcandidate.model";
import { PoliceVerification } from "../../modals/policeverification.model";
import { ComplianceChecklist } from "../../modals/compliancechecklist.model";
import { BestPracticesFacility } from "../../modals/bestpracticesfacility.model";
import { PreInterviewedContractor } from "../../modals/preinterviewedcontractor.model";

const badgeService = new CommonService(Badge);

export class BadgeController {
  static async createBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await badgeService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create badge"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllBadges(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await badgeService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllUserBadges(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, id: userId } = (req as any).user;
      const allRoleBadges = await Badge.find({ userTypes: role }).lean();
      const badgeIdToKeyMap = new Map<string, string>();
      allRoleBadges.forEach((badge) => {
        badgeIdToKeyMap.set(badge.slug, badge.name);
      });
      const statusMap = new Map<string, string>();

      // Define badge.key → model map for pending requests
      const pendingBadgeModels: Record<string, any> = {
        'top_recruiter': TopRecruiter,
        'reliable_payer': ReliablePayer,
        'safe_workplace': SafeWorkplace,
        "fast_responder": FastResponder,
        "trusted_partner": TrustedPartner,
        'highly_preferred': HighlyPreferred,
        "police_verified": PoliceVerification,
        "skilled_candidate": SkilledCandidate,
        'compliance_pro': ComplianceChecklist,
        "trained_by_worker_sahaye": TrainedWorker,
        "pre_interviewed_candidate": PreInterviewed,
        'best_facility__practices': BestPracticesFacility,
        "pre_screened_contractor": PreInterviewedContractor,
      };

      // Fetch statuses only for models included in current badge list
      const pendingResults = await Promise.all(
        Object.entries(pendingBadgeModels)
          .filter(([badgeKey]) => badgeIdToKeyMap.has(badgeKey)) // ✅ Only relevant keys
          .map(async ([badgeKey, Model]) => {
            const record = await Model.findOne({ user: userId }, { status: 1 }).lean();
            return record ? { key: badgeKey, status: record.status } : null;
          })
      );

      // Merge into statusMap only if not already present
      pendingResults.filter(Boolean).forEach(({ key, status }: any) => {
        if (!statusMap.has(key)) statusMap.set(key, status);
      });

      const badgeList = allRoleBadges.map((badge) => {
        const status = statusMap.get(badge.slug);
        const updatedStatus = status && status === "pending" ? "requested" : status || "pending";
        return { ...badge, status: updatedStatus };
      });
      return res
        .status(200)
        .json(new ApiResponse(200, badgeList, "Badges fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getBadgeById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await badgeService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "badge not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateBadgeById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await badgeService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update badge"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteBadgeById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await badgeService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete badge"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
