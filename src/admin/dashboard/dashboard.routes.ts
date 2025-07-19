import express from "express";
import { asyncHandler } from "./../../utils/asyncHandler";
import { DashboardController } from "./dashboard.controller";
import { allowAllExcept, authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
    getCurrentStats,
    getDashboardStats,
    getUserTypeCounts,
    getBadgeStatusCounts,
    getJobApplicationsStats,
    getServicesStatusCounts,
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
    "/badge-count",
    authenticateToken,
    isAdmin,
    asyncHandler(getBadgeStatusCounts)
);
router.get(
    "/service-count",
    authenticateToken,
    isAdmin,
    asyncHandler(getServicesStatusCounts)
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
    allowAllExcept("worker", "agent"),
    asyncHandler(getJobApplicationsStats)
);

export default router;