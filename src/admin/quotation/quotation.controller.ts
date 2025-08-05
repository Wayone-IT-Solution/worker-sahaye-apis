import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { getModelFromType, modelMap, Quotation, RequestModelType } from "../../modals/quotation.model";

const QuotationService = new CommonService(Quotation);

export class QuotationController {
  static async createQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      const { requestId, requestModel } = req.body;
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
      const agentId = requestDoc.salesPersonTo;

      if (!agentId) return res.status(404).json(new ApiError(404, "Please Assign Sales person first!"));
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

      const quotation = await Quotation.create({
        userId,
        agentId,
        requestId,
        ...req.body,
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
      const page = parseInt((req.query.page as string) || "1", 10);
      const limit = parseInt((req.query.limit as string) || "10", 10);
      const skip = (page - 1) * limit;

      const matchStage: any = {};
      if (requestModel) {
        matchStage.requestModel = requestModel;
      }

      const totalCount = await Quotation.countDocuments();
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
          const requestDetails = await Model.findById(q.requestId).lean();
          return { ...q, requestDetails: requestDetails || null };
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
      const result = await QuotationService.updateById(
        req.params.id,
        req.body
      );
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
