import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { SubscriptionplanController } from "./subscriptionplan.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createSubscriptionplan,
  getAllSubscriptionplans,
  getSubscriptionplanById,
  updateSubscriptionplanById,
  deleteSubscriptionplanById,
  getPlansByUserType,
  getRecommendedPlans,
  getPopularPlans,
  updatePlanFeatures,
  togglePlanStatus,
  getPlanFeaturesSummary,
  comparePlans,
} = SubscriptionplanController;

const router = express.Router();

// Public routes
router.get("/recommended", asyncHandler(getRecommendedPlans));
router.get("/popular", asyncHandler(getPopularPlans));
router.get("/user-type/:userType", asyncHandler(getPlansByUserType));
router.post("/compare", asyncHandler(comparePlans));

// Admin routes
router.get("/", authenticateToken, isAdmin, asyncHandler(getAllSubscriptionplans));
router.post("/", authenticateToken, isAdmin, asyncHandler(createSubscriptionplan));
router.get("/:id", authenticateToken, isAdmin, asyncHandler(getSubscriptionplanById));
router.put("/:id", authenticateToken, isAdmin, asyncHandler(updateSubscriptionplanById));
router.delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteSubscriptionplanById));

// Feature management routes
router.get("/:id/features-summary", authenticateToken, asyncHandler(getPlanFeaturesSummary));
router.put("/:id/features", authenticateToken, isAdmin, asyncHandler(updatePlanFeatures));
router.patch("/:id/toggle-status", authenticateToken, isAdmin, asyncHandler(togglePlanStatus));

export default router;
