import express from "express";
import { JobController } from "./job.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { allowAllExcept, authenticateToken, isAdmin, isWorker } from "../../middlewares/authMiddleware";

const {
  createJob,
  getAllJobs,
  getJobById,
  addJobComment,
  updateJobById,
  deleteJobById,
  updateJobStatus,
  getJobWithHistory,
  getAllUserWiseJobs,
  getAllSuggestedJobsByUser
} = JobController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllJobs))
  .get("/:id", authenticateToken, asyncHandler(getJobById))
  .put("/:id", authenticateToken, asyncHandler(updateJobById))
  .delete("/:id", authenticateToken, asyncHandler(deleteJobById))
  .get("/user-wise/list", authenticateToken, asyncHandler(getAllUserWiseJobs))
  .put("/add-comment/:id", authenticateToken, isAdmin, asyncHandler(addJobComment))
  .put("/update-status/:id", authenticateToken, isAdmin, asyncHandler(updateJobStatus))
  .patch("/get-comment-history/:id", authenticateToken, asyncHandler(getJobWithHistory))
  .post("/", authenticateToken, allowAllExcept("admin", "worker", "agent"), asyncHandler(createJob))
  .get("/suggested-jobs/list", authenticateToken, isWorker, asyncHandler(getAllSuggestedJobsByUser));

export default router;
