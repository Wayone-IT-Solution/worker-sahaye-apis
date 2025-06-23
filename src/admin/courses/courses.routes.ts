import express from "express";
import { LessonController } from "./lesson.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { CourseController } from "./courses.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";

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
  markAsStarted,
  getLessonById,
  markAsCompleted,
  updateLessonById,
  deleteLessonById,
  getLessonsByCourseId,
} = LessonController;

const router = express.Router();

router
  .post(
    "/",
    authenticateToken,
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("courses"),
    asyncHandler(createCourse)
  )
  .get("/", authenticateToken, asyncHandler(getAllCourses))
  .get("/:id", authenticateToken, asyncHandler(getCourseById))
  .put(
    "/:id",
    authenticateToken,
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("courses"),
    asyncHandler(updateCourseById)
  )
  .delete("/:id", authenticateToken, asyncHandler(deleteCourseById));

// LESSON ROUTES (Safe Nesting)
router.post("/lesson", authenticateToken, asyncHandler(createLesson));
router.get("/lesson/all", authenticateToken, asyncHandler(getAllLesson));
router.get("/lesson/:id", authenticateToken, asyncHandler(getLessonById));
router.put("/lesson/:id", authenticateToken, asyncHandler(updateLessonById));
router.delete("/lesson/:id", authenticateToken, asyncHandler(deleteLessonById));

// Optional: Get lessons for a specific course
router.get(
  "/:id/lesson",
  authenticateToken,
  asyncHandler(getLessonsByCourseId)
);
router.patch(
  "/mark-as-started",
  authenticateToken,
  asyncHandler(markAsStarted)
);
router.patch(
  "/mark-as-completed",
  authenticateToken,
  asyncHandler(markAsCompleted)
);

export default router;
