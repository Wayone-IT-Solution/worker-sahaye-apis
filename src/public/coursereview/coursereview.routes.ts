import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { CourseReviewController } from "./coursereview.controller";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";

const {
  createCourseReview,
  getAllCourseReviews,
  getCourseReviewById,
  deleteCourseReviewById,
} = CourseReviewController;

const router = express.Router();

router
  .post("/", authenticateToken, isWorker, asyncHandler(createCourseReview))
  .get("/", authenticateToken, asyncHandler(getAllCourseReviews))
  .get("/:id", authenticateToken, asyncHandler(getCourseReviewById))
  .delete("/:id", authenticateToken, asyncHandler(deleteCourseReviewById));

export default router;
