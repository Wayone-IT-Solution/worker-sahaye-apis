import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { Promotion } from "../../modals/promotion.model";

const promotionService = new CommonService(Promotion);

export class PromotionController {
    static async createPromotion(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const userId = (req as any).user?.id;

            if (!userId)
                return res
                    .status(401)
                    .json(new ApiError(401, "Authentication required"));

            const promotionData = {
                ...req.body,
                userId,
            };

            const result = await promotionService.create(promotionData);

            if (!result)
                return res
                    .status(400)
                    .json(new ApiError(400, "Failed to create promotion"));

            return res
                .status(201)
                .json(new ApiResponse(201, result, "Created successfully"));
        } catch (err) {
            next(err);
        }
    }

    static async getAllPromotions(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const result = await promotionService.getAll(req.query);

            return res
                .status(200)
                .json(new ApiResponse(200, result, "Data fetched successfully"));
        } catch (err) {
            next(err);
        }
    }

    static async getPromotionById(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const result = await promotionService.getById(req.params.id);

            if (!result)
                return res.status(404).json(new ApiError(404, "Promotion not found"));

            return res
                .status(200)
                .json(new ApiResponse(200, result, "Data fetched successfully"));
        } catch (err) {
            next(err);
        }
    }

    static async updatePromotionById(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const result = await promotionService.updateById(
                req.params.id,
                req.body
            );

            if (!result)
                return res
                    .status(404)
                    .json(new ApiError(404, "Failed to update promotion"));

            return res
                .status(200)
                .json(new ApiResponse(200, result, "Updated successfully"));
        } catch (err) {
            next(err);
        }
    }

    static async deletePromotionById(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const result = await promotionService.deleteById(req.params.id);

            if (!result)
                return res
                    .status(404)
                    .json(new ApiError(404, "Failed to delete promotion"));

            return res
                .status(200)
                .json(new ApiResponse(200, result, "Deleted successfully"));
        } catch (err) {
            next(err);
        }
    }

    static async getMyPromotions(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const userId = (req as any).user?.id;

            if (!userId)
                return res
                    .status(401)
                    .json(new ApiError(401, "Authentication required"));

            const result = await Promotion.find({ userId }).exec();

            return res
                .status(200)
                .json(
                    new ApiResponse(200, result, "Your promotions fetched successfully")
                );
        } catch (err) {
            next(err);
        }
    }
}
