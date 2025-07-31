import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { getModelFromType, Quotation, RequestModelType } from "../../modals/quotation.model";

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
      const pipeline: any[] = [
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
          $addFields: {
            requestModel: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$model", RequestModelType.BULK] },
                    then: RequestModelType.BULK.toLowerCase(),
                  },
                  {
                    case: { $eq: ["$model", RequestModelType.ONDEMAND] },
                    then: RequestModelType.ONDEMAND.toLowerCase(),
                  },
                  {
                    case: { $eq: ["$model", RequestModelType.VirtualHR] },
                    then: "virtualhrrequests",
                  },
                  {
                    case: { $eq: ["$model", RequestModelType.PROJECT] },
                    then: RequestModelType.PROJECT.toLowerCase(),
                  },
                  {
                    case: { $eq: ["$model", RequestModelType.SUPPORT] },
                    then: "unifiedservicerequests",
                  },
                ],
                default: null,
              },
            },
          },
        },
        {
          $lookup: {
            from: "$$ROOT.requestModel",
            let: { requestId: "$requestId", requestModel: "$requestModel" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$requestId"] } } },
            ],
            as: "requestDetails",
          },
        },
        {
          $unwind: {
            path: "$requestDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            __v: 0,
            updatedAt: 0,
            "user.__v": 0,
            "user.password": 0,
          },
        },
      ];
      const quotations = await QuotationService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, quotations, "Quotations fetched successfully"));
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
