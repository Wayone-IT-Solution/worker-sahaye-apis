import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { EnrollPlanController } from "./enrollplan.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  getAllEnrolled,
  adminAssignPlan,
  adminAssignPlanBulk,
  adminExpireEnrollPlan,
  createEnrollPlan,
  refundEnrollPlan,
  getAllEnrollPlans,
  getEnrollPlanById,
  updatePaymentStatus,
} = EnrollPlanController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createEnrollPlan)) // Enroll in plans
  .post("/admin/assign", authenticateToken, isAdmin, asyncHandler(adminAssignPlan))
  .post("/admin/assign-bulk", authenticateToken, isAdmin, asyncHandler(adminAssignPlanBulk))
  .patch("/admin/expire/:id", authenticateToken, isAdmin, asyncHandler(adminExpireEnrollPlan))
  .get("/", authenticateToken, asyncHandler(getAllEnrollPlans)) // Get all enrollPlans
  .get("/all/plans", authenticateToken, isAdmin, asyncHandler(getAllEnrolled)) // Get all enrollPlans
  .get("/all/plans/:id", authenticateToken, isAdmin, asyncHandler(getEnrollPlanById)) // Get all enrollPlans
  .get("/:id", authenticateToken, asyncHandler(getEnrollPlanById)) // Get specific enrollPlan
  .post(
    "/update-payment",
    authenticateToken,

    asyncHandler(updatePaymentStatus)
  ) // Update payment status manually if needed
  .post("/refund/:id", authenticateToken, asyncHandler(refundEnrollPlan)); // Refund a specific enrollPlan

export default router;
