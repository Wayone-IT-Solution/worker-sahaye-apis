import express from "express";
import { asyncHandler } from "./../../utils/asyncHandler";
import { DashboardController } from "./dashboard.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
    getCurrentStats,
    getDashboardStats,
    getUserTypeCounts,
    getJobApplicationsStats,
    getCustomerSupportDetails,
    getYearlyRevenueComparison,
} = DashboardController;

const router = express.Router();

router.get("/",
    authenticateToken,
    isAdmin,
    asyncHandler(getDashboardStats));
router.get(
    "/current-stats",
    authenticateToken,
    asyncHandler(getCurrentStats));
router.get(
    "/revenue-stats",
    authenticateToken,
    isAdmin,
    asyncHandler(getYearlyRevenueComparison)
);
router.get(
    "/customer-support",
    authenticateToken,
    isAdmin,
    asyncHandler(getCustomerSupportDetails)
);
router.get(
    "/user-stats",
    authenticateToken,
    isAdmin,
    asyncHandler(getUserTypeCounts)
);
router.get(
    "/job-applications",
    authenticateToken,
    isAdmin,
    asyncHandler(getJobApplicationsStats)
);

export default router;