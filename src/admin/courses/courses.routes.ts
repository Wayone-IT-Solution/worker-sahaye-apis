import express from "express";
import { LessonController } from "./lesson.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { CourseController } from "./courses.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourseById,
  deleteCourseById,
} = CourseController;

const {
  createLesson,
  getAllLesson,
  getLessonById,
  markAsCompleted,
  updateLessonById,
  deleteLessonById,
  getLessonsByCourseId,
} = LessonController;

const router = express.Router();

router
  .post("/", asyncHandler(createCourse))
  .get("/", asyncHandler(getAllCourses))
  .get("/:id", asyncHandler(getCourseById))
  .put("/:id", asyncHandler(updateCourseById))
  .delete("/:id", asyncHandler(deleteCourseById));

// LESSON ROUTES (Safe Nesting)
router.post("/lesson", asyncHandler(createLesson));
router.get("/lesson/all", asyncHandler(getAllLesson));
router.get("/lesson/:id", asyncHandler(getLessonById));
router.put("/lesson/:id", asyncHandler(updateLessonById));
router.delete("/lesson/:id", asyncHandler(deleteLessonById));

// Optional: Get lessons for a specific course
router.get("/:id/lesson", asyncHandler(getLessonsByCourseId));
router.patch(
  "/mark-as-completed",
  authenticateToken,
  asyncHandler(markAsCompleted)
);

export default router;
