import express from "express";
import { JobController } from "./job.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";

const {
  createJob,
  getAllJobs,
  getJobById,
  updateJobById,
  deleteJobById,
  updateJobStatus,
  getAllSuggestedJobsByUser
} = JobController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllJobs))
  .post("/", authenticateToken, asyncHandler(createJob))
  .get("/:id", authenticateToken, asyncHandler(getJobById))
  .put("/:id", authenticateToken, asyncHandler(updateJobById))
  .delete("/:id", authenticateToken, asyncHandler(deleteJobById))
  .put("/update-status/:id", authenticateToken, asyncHandler(updateJobStatus))
  .get("/suggested-jobs/list", authenticateToken, isWorker, asyncHandler(getAllSuggestedJobsByUser));

export default router;
