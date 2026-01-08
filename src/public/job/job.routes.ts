import express from "express";
import { JobController } from "./job.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  isAdmin,
  isWorker,
  allowAllExcept,
  authenticateToken,
} from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";
import { enforceJobListingLimit } from "../../middlewares/jobListingLimitMiddleware";

const {
  createJob,
  getAllJobs,
  getJobById,
  addJobComment,
  updateJobById,
  deleteJobById,
  updateJobStatus,
  uploadJobUpdated,
  getJobWithHistory,
  getAllUserWiseJobs,
  getJobListingUsage,
  getAllSuggestedJobsByUser,
} = JobController;

const router = express.Router();

router
  .get(
    "/listing/usage",
    authenticateToken,
    allowAllExcept("admin", "worker", "agent"),
    asyncHandler(getJobListingUsage)
  )
  .get("/", authenticateToken, asyncHandler(getAllJobs))
  .get(
    "/:id",
    (req, res, next) => {
      // Make token optional
      if (req.headers.authorization) {
        authenticateToken(req, res, next);
      } else {
        next();
      }
    },
    asyncHandler(getJobById)
  )
  .put("/:id", authenticateToken, asyncHandler(updateJobById))
  .delete("/:id", authenticateToken, asyncHandler(deleteJobById))
  .get("/user-wise/list", authenticateToken, asyncHandler(getAllUserWiseJobs))
  .get("/user-wise/list/:id", authenticateToken, asyncHandler(getJobById))
  .post(
    "/document",
    authenticateToken,
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("jobposting"),
    asyncHandler(uploadJobUpdated)
  )
  .post(
    "/user-wise/list",
    authenticateToken,
    asyncHandler(enforceJobListingLimit),
    asyncHandler(createJob)
  )
  .put("/user-wise/list/:id", authenticateToken, asyncHandler(updateJobById))
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
    asyncHandler(enforceJobListingLimit),
    asyncHandler(createJob)
  )
  .get(
    "/suggested-jobs/list",
    authenticateToken,
    isWorker,
    asyncHandler(getAllSuggestedJobsByUser)
  );

export default router;
