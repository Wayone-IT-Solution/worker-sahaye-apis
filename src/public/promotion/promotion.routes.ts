import express from "express";
import { PromotionController } from "./promotion.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
    createPromotion,
    getAllPromotions,
    getPromotionById,
    updatePromotionById,
    deletePromotionById,
    getMyPromotions,
} = PromotionController;

const router = express.Router();

router
    .get("/", authenticateToken, asyncHandler(getAllPromotions))
    .post("/", authenticateToken, asyncHandler(createPromotion))
    .get("/my", authenticateToken, asyncHandler(getMyPromotions))
    .get("/:id", authenticateToken, asyncHandler(getPromotionById))
    .put("/:id", authenticateToken, asyncHandler(updatePromotionById))
    .delete("/:id", authenticateToken, asyncHandler(deletePromotionById));

export default router;
