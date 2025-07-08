import express from "express";
import { asyncHandler } from "./../../utils/asyncHandler";
import { DashboardController } from "./dashboard.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const {
    getDashboardStats,
    getCustomerSupportDetails,
    getYearlyRevenueComparison,
} = DashboardController;

const router = express.Router();

router.get("/", authenticateToken, asyncHandler(getDashboardStats));
router.get(
    "/revenue-stats",
    authenticateToken,
    asyncHandler(getYearlyRevenueComparison)
);
router.get(
    "/customer-support",
    authenticateToken,
    asyncHandler(getCustomerSupportDetails)
);

export default router;