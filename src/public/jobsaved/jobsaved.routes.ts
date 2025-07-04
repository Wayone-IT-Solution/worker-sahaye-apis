import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { JobSaveController } from "./jobsaved.controller";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";

const router = express.Router();

router.post(
  "/:id",
  authenticateToken,
  isWorker,
  asyncHandler(JobSaveController.saveJob)
);
router.get(
  "/",
  authenticateToken,
  isWorker,
  asyncHandler(JobSaveController.getSavedJobs)
);
router.get(
  "/list/all",
  authenticateToken,
  asyncHandler(JobSaveController.getAllSavedJobs)
);
router.delete(
  "/:jobId",
  authenticateToken,
  isWorker,
  asyncHandler(JobSaveController.unsaveJob)
);
router.get(
  "/recommendations",
  authenticateToken,
  isWorker,
  asyncHandler(JobSaveController.getJobRecommendations)
);

export default router;
