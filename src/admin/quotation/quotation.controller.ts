import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { getModelFromType, modelMap, Quotation, RequestModelType } from "../../modals/quotation.model";
import mongoose from "mongoose";

const QuotationService = new CommonService(Quotation);

const toSafeNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

export class QuotationController {
  static async createQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      const { requestModel: requestModelFromUrl } = req.params;
      const { requestId, requestModel: requestModelFromBody } = req.body;
      
      // requestModel can come from URL params or body, URL params take precedence
      const requestModel = requestModelFromUrl || requestModelFromBody;
      
      if (!requestId || !requestModel)
        return res.status(400).json(new ApiError(400, "RequestId and model type are required"));

      const RequestModel = getModelFromType(requestModel as RequestModelType);
      if (!RequestModel) return res.status(400).json(new ApiError(400, "Invalid model type"));

      const requestDoc = await (RequestModel as any).findById(requestId);
      if (!requestDoc)
        return res.status(404).json(new ApiError(404, "Request not found"));

      if (requestDoc?.status === "completed")
        return res.status(404).json(new ApiError(404, "Request has been already fulfilled"));

      const userId = requestDoc.userId;
      const agentId = requestDoc.assignedTo;

      if (!agentId) return res.status(404).json(new ApiError(404, "Please assign an employee first!"));
      const existingQuotation = await Quotation.findOne({
        userId,
        requestId,
        status: { $nin: ["rejected", "completed"] },
      });

      if (existingQuotation) {
        return res
          .status(400)
          .json(new ApiError(400, "Quotation already exists and is not fulfilled"));
      }

      const gstDetails = buildGSTDetails(req.body);

      const quotation = await Quotation.create({
        userId,
        agentId,
        requestId,
        ...req.body,
        ...gstDetails,
        requestModel,
      });
      return res
        .status(201)
        .json(new ApiResponse(201, quotation, "Quotation created successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async getAllQuotations(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { requestModel } = req.params;
      const { id: userId, role } = (req as any).user;

      const page = parseInt((req.query.page as string) || "1", 10);
      const limit = parseInt((req.query.limit as string) || "10", 10);
      const skip = (page - 1) * limit;

      const matchStage: any = {};
      if (requestModel) {
        matchStage.requestModel = requestModel;
      }

      if (role === "employer" || role === "contractor") {
        matchStage.userId = new mongoose.Types.ObjectId(userId)
      }

      const totalCount = await Quotation.countDocuments(matchStage);
      const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
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
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            status: 1,
            amount: 1,
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

            // User Info
            "user._id": 1,
            "user.email": 1,
            "user.mobile": 1,
            "user.userType": 1,
            "user.fullName": 1,

            // Salesperson Info
            "salesPersonToDetails._id": 1,
            "salesPersonToDetails.name": 1,
            "salesPersonToDetails.email": 1,
            "salesPersonToDetails.mobile": 1,
          }
        },
      ];

      // Fetch paginated quotations
      const rawQuotations = await Quotation.aggregate(pipeline);

      // Enrich with requestDetails from dynamic model
      const enrichedQuotations = await Promise.all(
        rawQuotations.map(async (q) => {
          const Model = modelMap[q.requestModel];
          if (!Model || !q.requestId) return q;
          
          // Use aggregation to populate assignedToDetails
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
        })
      );

      // Respond with pagination data
      return res.status(200).json(
        new ApiResponse(200, {
          result: enrichedQuotations,
          pagination: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        }, "Quotations fetched successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  static async getQuotationById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await QuotationService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "quotation not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateQuotationById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const existing = await Quotation.findById(req.params.id);
      if (!existing) {
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update quotation"));
      }

      const gstDetails = buildGSTDetails({
        amount: req.body?.amount ?? existing.amount,
        gstType: req.body?.gstType ?? existing.gstType,
        gstRate: req.body?.gstRate ?? existing.gstRate,
      });

      const result = await QuotationService.updateById(req.params.id, {
        ...req.body,
        ...gstDetails,
      });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update quotation"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteQuotationById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await QuotationService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete quotation"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
