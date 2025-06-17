import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { EnrollmentController } from "./enrollment.controller";
import { isWorker, authenticateToken } from "../../middlewares/authMiddleware";

const {
  createEnrollment,
  refundEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updatePaymentStatus,
} = EnrollmentController;

const router = express.Router();

router
  .post("/", authenticateToken, isWorker, asyncHandler(createEnrollment)) // Enroll in course
  .get("/", authenticateToken, isWorker, asyncHandler(getAllEnrollments)) // Get all enrollments
  .get("/:id", authenticateToken, isWorker, asyncHandler(getEnrollmentById)) // Get specific enrollment
  .post(
    "/update-payment",
    authenticateToken,
    isWorker,
    asyncHandler(updatePaymentStatus)
  ) // Update payment status manually if needed
  .post(
    "/refund/:id",
    authenticateToken,
    isWorker,
    asyncHandler(refundEnrollment)
  ); // Refund a specific enrollment

export default router;
