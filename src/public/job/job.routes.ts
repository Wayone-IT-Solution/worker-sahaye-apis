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
import { cacheGetResponse, invalidateCacheAfterSuccess } from "../../middlewares/cacheMiddleware";

const {
  createJob,
  createBulkJobsForOwner,
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
  getJobCities,
  getMyJobs,
  getAllContractorJobs,
} = JobController;

const router = express.Router();

// Get all jobs posted by current user
router.get(
  "/my",
  authenticateToken,
  asyncHandler(getMyJobs)
);

router
  .get(
    "/listing/usage",
    authenticateToken,
    allowAllExcept("admin", "worker", "agent"),
    asyncHandler(getJobListingUsage)
  )
  .get("/cities", cacheGetResponse("JobCities", { logLabel: "job-cities" }), asyncHandler(getJobCities))
  .get("/contractor/list", authenticateToken, cacheGetResponse("JobContractorList", { varyByUser: true, logLabel: "job-contractor-list" }), asyncHandler(getAllContractorJobs))
  .get("/", authenticateToken, cacheGetResponse("JobList", { varyByUser: true, logLabel: "job-list" }), asyncHandler(getAllJobs))
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
  .put(
    "/:id",
    authenticateToken,
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("jobposting"),
    invalidateCacheAfterSuccess("Job", { logLabel: "job-update" }),
    asyncHandler(updateJobById)
  )
  .delete("/:id", authenticateToken, invalidateCacheAfterSuccess("Job", { logLabel: "job-delete" }), asyncHandler(deleteJobById))
  .get("/user-wise/list", authenticateToken, cacheGetResponse("JobUserWiseList", { varyByUser: true, logLabel: "job-user-wise-list" }), asyncHandler(getAllUserWiseJobs))
  .get("/user-wise/list/:id", authenticateToken, cacheGetResponse("JobUserWiseById", { varyByUser: true, logLabel: "job-user-wise-by-id" }), asyncHandler(getJobById))
  .post(
    "/document",
    authenticateToken,
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("jobposting"),
    invalidateCacheAfterSuccess("Job", { logLabel: "job-document-upload" }),
    asyncHandler(uploadJobUpdated)
  )
  .post(
    "/user-wise/list",
    authenticateToken,
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("jobposting"),
    asyncHandler(enforceJobListingLimit),
    invalidateCacheAfterSuccess("Job", { logLabel: "job-user-wise-create" }),
    asyncHandler(createJob)
  )
  .put(
    "/user-wise/list/:id",
    authenticateToken,
    dynamicUpload([{ name: "imageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("jobposting"),
    invalidateCacheAfterSuccess("Job", { logLabel: "job-user-wise-update" }),
    asyncHandler(updateJobById)
  )
  .delete("/user-wise/list/:id", authenticateToken, invalidateCacheAfterSuccess("Job", { logLabel: "job-user-wise-delete" }), asyncHandler(deleteJobById))
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
    invalidateCacheAfterSuccess("Job", { logLabel: "job-status-update" }),
    asyncHandler(updateJobStatus)
  )
  .patch(
    "/get-comment-history/:id",
    authenticateToken,
    asyncHandler(getJobWithHistory)
  )
  .post(
    "/admin/bulk/:ownerId",
    authenticateToken,
    isAdmin,
    invalidateCacheAfterSuccess("Job", { logLabel: "job-bulk-create" }),
    asyncHandler(createBulkJobsForOwner)
  )
  .post(
    "/",
    authenticateToken,
    allowAllExcept("admin", "worker", "agent"),
    asyncHandler(enforceJobListingLimit),
    invalidateCacheAfterSuccess("Job", { logLabel: "job-create" }),
    asyncHandler(createJob)
  )
  .get(
    "/suggested-jobs/list",
    authenticateToken,
    isWorker,
    cacheGetResponse("JobSuggestedList", { varyByUser: true, logLabel: "job-suggested-list" }),
    asyncHandler(getAllSuggestedJobsByUser)
  );

export default router;
