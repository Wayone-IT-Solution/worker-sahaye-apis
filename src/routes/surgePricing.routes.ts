import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createSurgePricing,
  getAllSurgePricings,
  getSurgePricingById,
  updateSurgePricing,
  deleteSurgePricing,
  toggleSurgePricingActive,
} from "../controllers/surgePricing.controller";
import { authenticateToken, isAdmin } from "../middlewares/authMiddleware";

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken, isAdmin);

// 🔄 Surge Pricing Routes
router
  .route("/")
  .post(asyncHandler(createSurgePricing))
  .get(asyncHandler(getAllSurgePricings));

router
  .route("/:id")
  .get(asyncHandler(getSurgePricingById))
  .put(asyncHandler(updateSurgePricing))
  .delete(asyncHandler(deleteSurgePricing));

router.patch("/:id/toggle", asyncHandler(toggleSurgePricingActive));

export default router;
