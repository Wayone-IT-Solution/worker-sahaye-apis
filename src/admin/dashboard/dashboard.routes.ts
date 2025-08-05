import express from "express";
import { asyncHandler } from "./../../utils/asyncHandler";
import { DashboardController } from "./dashboard.controller";
import { allowAllExcept, authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
    getCurrentStats,
    getDashboardStats,
    getIvrCallSummary,
    getBadgeStatusCounts,
    getServicesStatusCounts,
    getJobApplicationsStats,
    getCustomerSupportDetails,
    getQuotationAmountSummary,
    getQuotationsStatusCounts,
    getYearlyRevenueComparison,
    getUserStatsByTypeAndStatus,
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
    "/ivrcall-summary",
    authenticateToken,
    isAdmin,
    asyncHandler(getIvrCallSummary)
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
    "/service-quotations-count",
    authenticateToken,
    isAdmin,
    asyncHandler(getQuotationsStatusCounts)
);
router.get(
    "/quotation-amount-summary",
    // authenticateToken,
    // isAdmin,
    asyncHandler(getQuotationAmountSummary)
);
router.get(
    "/user-stats",
    authenticateToken,
    isAdmin,
    asyncHandler(getUserStatsByTypeAndStatus)
);
router.get(
    "/job-applications",
    authenticateToken,
    allowAllExcept("worker", "agent"),
    asyncHandler(getJobApplicationsStats)
);

export default router;