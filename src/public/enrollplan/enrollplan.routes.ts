import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { EnrollPlanController } from "./enrollplan.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const {
  getAllEnrolled,
  createEnrollPlan,
  refundEnrollPlan,
  getAllEnrollPlans,
  getEnrollPlanById,
  updatePaymentStatus,
} = EnrollPlanController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createEnrollPlan)) // Enroll in plans
  .get("/", authenticateToken, asyncHandler(getAllEnrollPlans)) // Get all enrollPlans
  .get("/all/plans", authenticateToken, asyncHandler(getAllEnrolled)) // Get all enrollPlans
  .get("/:id", authenticateToken, asyncHandler(getEnrollPlanById)) // Get specific enrollPlan
  .post(
    "/update-payment",
    authenticateToken,

    asyncHandler(updatePaymentStatus)
  ) // Update payment status manually if needed
  .post("/refund/:id", authenticateToken, asyncHandler(refundEnrollPlan)); // Refund a specific enrollPlan

export default router;
