import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { EnrollmentController } from "./enrollment.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createEnrollment,
  adminAssignCourse,
  refundEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updatePaymentStatus,
  issueCertificateByAdmin,
  getAllAdminEnrollments,
  getCourseWiseEnrollmentStats,
  getCourseParticipantsByCourse,
  updateParticipantRemarkByAdmin,
} = EnrollmentController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createEnrollment)) // Enroll in course
  .post("/admin/assign", authenticateToken, isAdmin, asyncHandler(adminAssignCourse))
  .get(
    "/admin/course-wise",
    authenticateToken,
    isAdmin,
    asyncHandler(getCourseWiseEnrollmentStats)
  )
  .get(
    "/admin/course/:courseId/participants",
    authenticateToken,
    isAdmin,
    asyncHandler(getCourseParticipantsByCourse)
  )
  .get("/", authenticateToken, asyncHandler(getAllEnrollments)) // Get all enrollments
  .get("/all", authenticateToken, asyncHandler(getAllAdminEnrollments)) // Get all enrollments till now
  .patch(
    "/admin/participant/:id/remark",
    authenticateToken,
    isAdmin,
    asyncHandler(updateParticipantRemarkByAdmin)
  )
  .patch(
    "/admin/:id/issue-certificate",
    authenticateToken,
    isAdmin,
    asyncHandler(issueCertificateByAdmin)
  )
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
