import express from "express";
import { asyncHandler } from "./../../utils/asyncHandler";
import { DashboardController } from "./dashboard.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const {
    getDashboardStats,
    getUserTypeCounts,
    getJobApplicationsStats,
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
router.get(
    "/user-stats",
    authenticateToken,
    asyncHandler(getUserTypeCounts)
);
router.get(
    "/job-applications",
    authenticateToken,
    asyncHandler(getJobApplicationsStats)
);

export default router;