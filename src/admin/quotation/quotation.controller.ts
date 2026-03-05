import mongoose from "mongoose";
import { NextFunction, Request, Response } from "express";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import ActivityLog from "../../modals/activitylog.model";
import { User } from "../../modals/user.model";
import { CommonService } from "../../services/common.services";
import { uploadToS3 } from "../../config/s3Uploader";
import {
  getModelFromType,
  modelMap,
  Quotation,
  QuotationStatus,
  RequestModelType,
} from "../../modals/quotation.model";

const QuotationService = new CommonService(Quotation);

const DIRECT_SEARCH_FIELDS = new Set([
  "status",
  "paymentMode",
  "requestModel",
  "_id",
  "user.fullName",
  "user.email",
  "user.mobile",
  "salesPersonToDetails.name",
  "salesPersonToDetails.email",
  "salesPersonToDetails.mobile",
  "userResponse.decision",
]);

const toSafeNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseMaybeBoolean = (value: any): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive"].includes(normalized)) return false;
  }
  if (typeof value === "number") return value === 1;
  return undefined;
};

const parseIfJson = (value: any): any => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeRole = (role?: string): "admin" | "employer" | "contractor" | "worker" | "agent" | "system" => {
  if (role === "admin") return "admin";
  if (role === "employer") return "employer";
  if (role === "contractor") return "contractor";
  if (role === "worker") return "worker";
  if (role === "agent") return "agent";
  return "system";
};

const normalizeRoleForActivityLog = (role?: string): "User" | "Agent" | "Admin" | "Rider" => {
  if (role === "admin") return "Admin";
  if (role === "agent") return "Agent";
  if (role === "rider") return "Rider";
  return "User";
};

const buildGSTDetails = (payload: any) => {
  const amount = toSafeNumber(payload?.amount);
  const gstRate = Math.max(0, toSafeNumber(payload?.gstRate));
  const gstType = payload?.gstType === "inter_state" ? "inter_state" : "intra_state";

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;

  if (gstType === "inter_state") {
    igstRate = gstRate;
  } else {
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
  }

  const cgstAmount = +((amount * cgstRate) / 100).toFixed(2);
  const sgstAmount = +((amount * sgstRate) / 100).toFixed(2);
  const igstAmount = +((amount * igstRate) / 100).toFixed(2);
  const totalTaxAmount = +(cgstAmount + sgstAmount + igstAmount).toFixed(2);
  const totalAmountWithTax = +(amount + totalTaxAmount).toFixed(2);

  return {
    gstType,
    gstRate,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTaxAmount,
    totalAmountWithTax,
  };
};

const parseIncomingNotes = (value: any) => {
  const parsed = parseIfJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item: any) => ({
      text: String(item?.text ?? "").trim(),
      status: item?.status,
    }))
    .filter((item: any) => item.text && Object.values(QuotationStatus).includes(item.status));
};

const buildSnapshot = (quotation: any) => {
  const raw = quotation?.toObject
    ? quotation.toObject({ virtuals: false })
    : { ...(quotation || {}) };
  if (raw && typeof raw === "object") {
    delete raw.__v;
    delete raw.activityTimeline;
  }
  return raw;
};

const appendQuotationActivity = async (
  quotation: any,
  req: Request,
  action: "created" | "updated" | "accepted" | "declined",
  comment?: string,
) => {
  const actorId = (req as any)?.user?.id;
  const actorRole = normalizeRole((req as any)?.user?.role);
  const snapshot = buildSnapshot(quotation);

  quotation.activityTimeline = quotation.activityTimeline || [];
  quotation.activityTimeline.push({
    action,
    status: quotation.status,
    comment: comment?.trim() || undefined,
    actorRole,
    actorId:
      actorId && mongoose.Types.ObjectId.isValid(actorId)
        ? new mongoose.Types.ObjectId(actorId)
        : undefined,
    snapshot,
    createdAt: new Date(),
  });
  await quotation.save();

  await ActivityLog.create({
    userId:
      actorId && mongoose.Types.ObjectId.isValid(actorId)
        ? new mongoose.Types.ObjectId(actorId)
        : null,
    role: normalizeRoleForActivityLog((req as any)?.user?.role),
    action: `QUOTATION_${action.toUpperCase()}`,
    description: `Quotation ${quotation?._id} ${action}`,
    pathParams: req.params,
    queryParams: req.query,
    requestBody: req.body,
    responseBody: snapshot,
  }).catch((error: any) => {
    console.log("Failed to save quotation activity log:", error?.message || error);
  });
};

const syncRequestAfterAcceptance = async (quotation: any) => {
  const Model: any = getModelFromType(quotation.requestModel as RequestModelType);
  if (!Model || !quotation?.requestId) return;

  const requestDoc: any = await Model.findById(quotation.requestId);
  if (!requestDoc) return;

  const updates: Record<string, any> = {};
  const currentStatus = String(requestDoc?.status || "");

  if (typeof requestDoc?.status === "string") {
    if (quotation.requestModel === RequestModelType.PROMOTION) {
      if (currentStatus.toLowerCase() !== "approved") updates.status = "approved";
    } else {
      const lowered = currentStatus.toLowerCase();
      if (!["completed", "cancelled"].includes(lowered) && currentStatus !== "Assigned") {
        updates.status = "Assigned";
      }
    }
  }

  if (requestDoc?.assignedAt !== undefined && !requestDoc?.assignedAt) {
    updates.assignedAt = new Date();
  }

  if (requestDoc?.assignedTo !== undefined && !requestDoc?.assignedTo && quotation?.agentId) {
    updates.assignedTo = quotation.agentId;
  }

  if (Object.keys(updates).length > 0) {
    await Model.findByIdAndUpdate(quotation.requestId, updates, { new: true });
  }
};

const normalizeBodyForQuotation = (body: any) => {
  const payload: any = { ...body };

  if (payload?.amount !== undefined) payload.amount = toSafeNumber(payload?.amount);
  if (payload?.gstRate !== undefined) payload.gstRate = toSafeNumber(payload?.gstRate);
  if (payload?.advanceAmount !== undefined) {
    payload.advanceAmount = toSafeNumber(payload?.advanceAmount);
  }

  const isAdvancePaid = parseMaybeBoolean(payload?.isAdvancePaid);
  if (isAdvancePaid !== undefined) payload.isAdvancePaid = isAdvancePaid;

  if (payload?.paymentMode && typeof payload.paymentMode === "string") {
    payload.paymentMode = payload.paymentMode.toLowerCase();
  }

  if (payload?.paymentDate) {
    const paymentDate = new Date(payload.paymentDate);
    if (!Number.isNaN(paymentDate.getTime())) {
      payload.paymentDate = paymentDate;
    } else {
      delete payload.paymentDate;
    }
  }

  if (payload?.status && !Object.values(QuotationStatus).includes(payload.status)) {
    delete payload.status;
  }

  return payload;
};

export class QuotationController {
  static async getQuotationRequestOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = (req as any).user || {};
      if (role !== "admin") {
        return res.status(403).json(new ApiError(403, "Only admin can access request options"));
      }

      const requestModel = String(req.query.requestModel || "").trim();
      const userType = String(req.query.userType || "").trim().toLowerCase();
      const search = String(req.query.search || "").trim().toLowerCase();
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));

      if (!requestModel || !Object.values(RequestModelType).includes(requestModel as RequestModelType)) {
        return res.status(400).json(new ApiError(400, "Valid requestModel is required"));
      }

      const RequestModel = getModelFromType(requestModel as RequestModelType) as any;
      if (!RequestModel) {
        return res.status(400).json(new ApiError(400, "Invalid request model"));
      }

      const candidateRequests = await RequestModel.find({})
        .sort({ createdAt: -1 })
        .limit(limit * 6)
        .lean();

      const formatted = await Promise.all(
        candidateRequests.map(async (requestDoc: any) => {
          const existingQuotation = await Quotation.findOne({
            requestId: requestDoc?._id,
            requestModel,
            status: { $nin: [QuotationStatus.REJECTED, QuotationStatus.COMPLETED] },
          })
            .select("_id")
            .lean();

          if (existingQuotation) return null;

          const user = await User.findById(requestDoc?.userId)
            .select("fullName email mobile userType userKey")
            .lean();
          if (!user) return null;

          if (["employer", "contractor"].includes(userType) && user.userType !== userType) {
            return null;
          }

          const searchable = [
            String(requestDoc?._id || ""),
            String(user?.fullName || ""),
            String(user?.email || ""),
            String(user?.mobile || ""),
            String(user?.userKey || ""),
          ]
            .join(" ")
            .toLowerCase();

          if (search && !searchable.includes(search)) return null;

          return {
            requestId: String(requestDoc?._id || ""),
            requestModel,
            requestStatus: String(requestDoc?.status || ""),
            userId: String(user?._id || ""),
            userType: user?.userType || "",
            userName: user?.fullName || "-",
            userEmail: user?.email || "-",
            userMobile: user?.mobile || "-",
            userKey: user?.userKey || "-",
          };
        }),
      );

      const result = formatted.filter(Boolean).slice(0, limit);
      return res
        .status(200)
        .json(new ApiResponse(200, { result }, "Quotation request options fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async createQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      const { requestModel: requestModelFromUrl } = req.params;
      const { requestId, requestModel: requestModelFromBody } = req.body;
      const requestModel = requestModelFromUrl || requestModelFromBody;

      if (!requestId || !requestModel) {
        return res.status(400).json(new ApiError(400, "RequestId and model type are required"));
      }

      const RequestModel = getModelFromType(requestModel as RequestModelType);
      if (!RequestModel) {
        return res.status(400).json(new ApiError(400, "Invalid model type"));
      }

      const requestDoc: any = await (RequestModel as any).findById(requestId);
      if (!requestDoc) {
        return res.status(404).json(new ApiError(404, "Request not found"));
      }

      if (String(requestDoc?.status || "").toLowerCase() === "completed") {
        return res.status(400).json(new ApiError(400, "Request has been already fulfilled"));
      }

      const userId = requestDoc.userId;
      const agentId = requestDoc.assignedTo || requestDoc.salesPersonTo || null;

      const existingQuotation = await Quotation.findOne({
        userId,
        requestId,
        status: { $nin: [QuotationStatus.REJECTED, QuotationStatus.COMPLETED] },
      });

      if (existingQuotation) {
        return res
          .status(400)
          .json(new ApiError(400, "Quotation already exists and is not fulfilled"));
      }

      const payload = normalizeBodyForQuotation(req.body);
      const noteText = String(payload?.note || "").trim();
      const incomingNotes = parseIncomingNotes(payload?.notes);
      delete payload.note;
      delete payload.notes;

      if (req.file) {
        payload.quotationDocument = await uploadToS3(
          req.file.buffer,
          req.file.originalname,
          "quotation-documents",
        );
      }

      const gstDetails = buildGSTDetails(payload);
      const quotation = await Quotation.create({
        userId,
        agentId,
        requestId,
        requestModel,
        ...payload,
        ...gstDetails,
      });

      if (incomingNotes.length > 0) {
        quotation.notes.push(...incomingNotes);
      }

      if (noteText) {
        quotation.notes.push({
          text: noteText,
          status: quotation.status || QuotationStatus.UNDER_REVIEW,
          createdAt: new Date(),
        });
      }

      await quotation.save();
      await appendQuotationActivity(quotation, req, "created", noteText);

      return res
        .status(201)
        .json(new ApiResponse(201, quotation, "Quotation created successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async getAllQuotations(req: Request, res: Response, next: NextFunction) {
    try {
      const { requestModel: requestModelFromPath } = req.params;
      const { id: userId, role } = (req as any).user;

      const page = parseInt((req.query.page as string) || "1", 10);
      const limit = parseInt((req.query.limit as string) || "10", 10);
      const skip = (page - 1) * limit;

      const requestModelFromQuery = String(req.query.requestModel || "").trim();
      const statusFromQuery = String(req.query.status || "").trim();
      const search = String(req.query.search || "").trim();
      const searchKey = String(req.query.searchkey || "").trim();

      const matchStage: any = {};
      const requestedModel = requestModelFromQuery || requestModelFromPath;
      if (
        requestedModel &&
        Object.values(RequestModelType).includes(requestedModel as RequestModelType)
      ) {
        matchStage.requestModel = requestedModel;
      }

      if (statusFromQuery && Object.values(QuotationStatus).includes(statusFromQuery as QuotationStatus)) {
        matchStage.status = statusFromQuery;
      }

      if (role === "employer" || role === "contractor") {
        matchStage.userId = new mongoose.Types.ObjectId(userId);
      }

      const basePipeline: any[] = [
        { $match: matchStage },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "salespeople",
            localField: "agentId",
            foreignField: "_id",
            as: "salesPersonToDetails",
          },
        },
        {
          $unwind: {
            path: "$salesPersonToDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      if (search && searchKey && DIRECT_SEARCH_FIELDS.has(searchKey)) {
        if (searchKey === "_id") {
          if (mongoose.Types.ObjectId.isValid(search)) {
            basePipeline.push({ $match: { _id: new mongoose.Types.ObjectId(search) } });
          } else {
            basePipeline.push({ $match: { _id: null } });
          }
        } else {
          basePipeline.push({
            $match: {
              [searchKey]: { $regex: escapeRegex(search), $options: "i" },
            },
          });
        }
      }

      const countPipeline = [...basePipeline, { $count: "totalItems" }];
      const countResult = await Quotation.aggregate(countPipeline);
      const totalCount = countResult?.[0]?.totalItems || 0;

      const rawQuotations = await Quotation.aggregate([
        ...basePipeline,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            status: 1,
            notes: 1,
            amount: 1,
            agentId: 1,
            createdAt: 1,
            updatedAt: 1,
            requestId: 1,
            paymentDate: 1,
            paymentMode: 1,
            requestModel: 1,
            isAdvancePaid: 1,
            advanceAmount: 1,
            gstType: 1,
            gstRate: 1,
            cgstRate: 1,
            sgstRate: 1,
            igstRate: 1,
            cgstAmount: 1,
            sgstAmount: 1,
            igstAmount: 1,
            totalTaxAmount: 1,
            totalAmountWithTax: 1,
            quotationDocument: 1,
            userResponse: 1,
            activityTimeline: 1,

            "user._id": 1,
            "user.email": 1,
            "user.mobile": 1,
            "user.userType": 1,
            "user.fullName": 1,

            "salesPersonToDetails._id": 1,
            "salesPersonToDetails.name": 1,
            "salesPersonToDetails.email": 1,
            "salesPersonToDetails.mobile": 1,
          },
        },
      ]);

      const enrichedQuotations = await Promise.all(
        rawQuotations.map(async (q) => {
          const Model = modelMap[q.requestModel];
          if (!Model || !q.requestId) return q;

          const requestDetailsPipeline = [
            { $match: { _id: new mongoose.Types.ObjectId(q.requestId) } },
            {
              $lookup: {
                from: "admins",
                localField: "assignedTo",
                foreignField: "_id",
                as: "assignedToDetails",
              },
            },
            {
              $unwind: {
                path: "$assignedToDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                "assignedToDetails.password": 0,
                "assignedToDetails.createdAt": 0,
                "assignedToDetails.updatedAt": 0,
              },
            },
          ];

          const requestDetailsArr = await Model.aggregate(requestDetailsPipeline);
          const requestDetails = requestDetailsArr.length > 0 ? requestDetailsArr[0] : null;
          return { ...q, requestDetails };
        }),
      );

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            result: enrichedQuotations,
            pagination: {
              currentPage: page,
              itemsPerPage: limit,
              totalItems: totalCount,
              totalPages: Math.ceil(totalCount / limit),
            },
          },
          "Quotations fetched successfully",
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  static async getQuotationById(req: Request, res: Response, next: NextFunction) {
    try {
      const result: any = await Quotation.findById(req.params.id)
        .populate("userId", "fullName email mobile userType")
        .populate("agentId", "name email mobile")
        .lean();

      if (!result) {
        return res.status(404).json(new ApiError(404, "Quotation not found"));
      }

      const { id: userId, role } = (req as any).user || {};
      if (
        (role === "employer" || role === "contractor") &&
        String(result.userId?._id || result.userId) !== String(userId)
      ) {
        return res.status(403).json(new ApiError(403, "Unauthorized quotation access"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateQuotationById(req: Request, res: Response, next: NextFunction) {
    try {
      const existing: any = await Quotation.findById(req.params.id);
      if (!existing) {
        return res.status(404).json(new ApiError(404, "Quotation not found"));
      }

      if (existing.status === QuotationStatus.APPROVED) {
        return res
          .status(409)
          .json(new ApiError(409, "Accepted quotation cannot be edited"));
      }

      if (req.body?.status === QuotationStatus.APPROVED) {
        return res
          .status(400)
          .json(new ApiError(400, "Use accept/decline API for user response"));
      }

      const payload = normalizeBodyForQuotation(req.body);
      const noteText = String(payload?.note || "").trim();
      const incomingNotes = parseIncomingNotes(payload?.notes);
      delete payload.note;
      delete payload.notes;

      if (req.file) {
        payload.quotationDocument = await uploadToS3(
          req.file.buffer,
          req.file.originalname,
          "quotation-documents",
        );
      }

      const gstDetails = buildGSTDetails({
        amount: payload?.amount ?? existing.amount,
        gstType: payload?.gstType ?? existing.gstType,
        gstRate: payload?.gstRate ?? existing.gstRate,
      });

      Object.assign(existing, payload, gstDetails);

      if (incomingNotes.length > 0) {
        existing.notes.push(...incomingNotes);
      }

      if (noteText) {
        existing.notes.push({
          text: noteText,
          status: existing.status,
          createdAt: new Date(),
        });
      }

      await existing.save();
      await appendQuotationActivity(existing, req, "updated", noteText);

      return res
        .status(200)
        .json(new ApiResponse(200, existing, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async respondToQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      const quotation: any = await Quotation.findById(req.params.id);
      if (!quotation) {
        return res.status(404).json(new ApiError(404, "Quotation not found"));
      }

      const { id: userId, role } = (req as any).user || {};
      const actorRole = String(role || "").toLowerCase();
      if (!["employer", "contractor"].includes(actorRole)) {
        return res.status(403).json(new ApiError(403, "Only agency/employer can respond"));
      }

      if (String(quotation.userId) !== String(userId)) {
        return res.status(403).json(new ApiError(403, "You can only respond to your own quotation"));
      }

      if (quotation.status === QuotationStatus.APPROVED) {
        return res.status(409).json(new ApiError(409, "Quotation already accepted"));
      }

      const decision = String(req.body?.action || "").trim().toLowerCase();
      const comment = String(req.body?.comment || "").trim();

      if (!["accept", "decline"].includes(decision)) {
        return res
          .status(400)
          .json(new ApiError(400, "Action must be either 'accept' or 'decline'"));
      }

      const nextStatus =
        decision === "accept" ? QuotationStatus.APPROVED : QuotationStatus.REJECTED;

      quotation.status = nextStatus;
      quotation.userResponse = {
        decision: decision === "accept" ? "accepted" : "declined",
        comment: comment || undefined,
        respondedAt: new Date(),
        respondedBy: new mongoose.Types.ObjectId(userId),
      };

      if (comment) {
        quotation.notes.push({
          text: comment,
          status: nextStatus,
          createdAt: new Date(),
        });
      }

      await quotation.save();

      if (decision === "accept") {
        await syncRequestAfterAcceptance(quotation);
      }

      await appendQuotationActivity(
        quotation,
        req,
        decision === "accept" ? "accepted" : "declined",
        comment,
      );

      return res.status(200).json(
        new ApiResponse(
          200,
          quotation,
          decision === "accept"
            ? "Quotation accepted successfully"
            : "Quotation declined successfully",
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteQuotationById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await QuotationService.deleteById(req.params.id);
      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete quotation"));
      }
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
