import { Router } from "express";
import {
  applyPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
  removePromotion,
  getAllPromotions,
  getPromotionById,
  getActivePromotions,
  togglePromotionStatus,
} from "../controllers/promotion.controller";
import {
  isAdmin,
  isPassenger,
  authenticateToken,
} from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// 🚀 Passenger routes
router.get("/active", isPassenger, asyncHandler(getActivePromotions));
router.post(
  "/apply",
  authenticateToken,
  isPassenger,
  asyncHandler(applyPromotion)
);
router.post(
  "/remove",
  authenticateToken,
  isPassenger,
  asyncHandler(removePromotion)
);

// 🛡 Admin routes
router.use(authenticateToken, isAdmin);

router
  .route("/")
  .post(asyncHandler(createPromotion))
  .get(asyncHandler(getAllPromotions));

router
  .route("/:id")
  .get(asyncHandler(getPromotionById))
  .put(asyncHandler(updatePromotion))
  .delete(asyncHandler(deletePromotion));

router.patch("/:id/toggle", asyncHandler(togglePromotionStatus));

export default router;
