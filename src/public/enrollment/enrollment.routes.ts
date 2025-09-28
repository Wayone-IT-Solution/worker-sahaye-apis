import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { EnrollmentController } from "./enrollment.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const {
  createEnrollment,
  refundEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updatePaymentStatus,
  getAllAdminEnrollments,
} = EnrollmentController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createEnrollment)) // Enroll in course
  .get("/", authenticateToken, asyncHandler(getAllEnrollments)) // Get all enrollments
  .get("/all", authenticateToken, asyncHandler(getAllAdminEnrollments)) // Get all enrollments till now
  .get("/:id", authenticateToken, asyncHandler(getEnrollmentById)) // Get specific enrollment
  .post(
    "/update-payment",
    authenticateToken,
    asyncHandler(updatePaymentStatus)
  ) // Update payment status manually if needed
  .post(
    "/refund/:id",
    authenticateToken,
    asyncHandler(refundEnrollment)
  ); // Refund a specific enrollment

export default router;
