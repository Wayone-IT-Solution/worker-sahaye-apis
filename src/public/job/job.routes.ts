import express from "express";
import { JobController } from "./job.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  isAdmin,
  isWorker,
  allowAllExcept,
  authenticateToken,
} from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

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
  getAllSuggestedJobsByUser,
} = JobController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllJobs))
  .get("/:id", authenticateToken, asyncHandler(getJobById))
  .put("/:id",
    authenticateToken,
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("jobposting"),
    asyncHandler(updateJobById))
  .delete("/:id", authenticateToken, asyncHandler(deleteJobById))
  .get("/user-wise/list", authenticateToken, asyncHandler(getAllUserWiseJobs))
  .get("/user-wise/list/:id", authenticateToken, asyncHandler(getJobById))
  .post("/user-wise/list",
    authenticateToken,
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("jobposting"),
    asyncHandler(createJob))
  .put("/user-wise/list/:id",
    authenticateToken,
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("jobposting"),
    asyncHandler(updateJobById))
  .delete("/user-wise/list/:id", authenticateToken, asyncHandler(deleteJobById))
  .put(
    "/add-comment/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(addJobComment)
  )
  .put(
    "/update-status/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateJobStatus)
  )
  .patch(
    "/get-comment-history/:id",
    authenticateToken,
    asyncHandler(getJobWithHistory)
  )
  .post(
    "/",
    authenticateToken,
    allowAllExcept("admin", "worker", "agent"),
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("jobposting"),
    asyncHandler(createJob)
  )
  .get(
    "/suggested-jobs/list",
    authenticateToken,
    isWorker,
    asyncHandler(getAllSuggestedJobsByUser)
  );

export default router;
