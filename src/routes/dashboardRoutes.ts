import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { DashboardController } from "../controllers/dashboardController";
import { authenticateToken, isAdmin } from "../middlewares/authMiddleware";

const router = Router();

// Grouping admin authentication middleware for all routes
router.use(authenticateToken, isAdmin);

/**
 * @route   GET /api/dashboard/
 * @desc    Get customer support details
 * @access  Admin
 */
router.get("/", asyncHandler(DashboardController.getCustomerSupportDetails));

/**
 * @route   GET /api/dashboard/ride-status
 * @desc    Get ride status summary
 * @access  Admin
 */
router.get(
  "/ride-status",
  asyncHandler(DashboardController.getRideStatusSummary)
);

/**
 * @route   GET /api/dashboard/yearly-stats
 * @desc    Get yearly ride statistics
 * @access  Admin
 */
router.get("/yearly-stats", asyncHandler(DashboardController.getRideStats));

export default router;
