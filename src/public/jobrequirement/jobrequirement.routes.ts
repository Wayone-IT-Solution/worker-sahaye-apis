import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { JobRequirementController } from "./jobrequirement.controller";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  createJobRequirement,
  getAllJobRequirements,
  getJobRequirementById,
  updateJobRequirementById,
  deleteJobRequirementById,
} = JobRequirementController;

const router = express.Router();

router
  .post("/",
    authenticateToken,
    dynamicUpload([{ name: "jobDescriptionUrl", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(createJobRequirement))
  .get("/", authenticateToken, asyncHandler(getAllJobRequirements))
  .get("/:id", authenticateToken, asyncHandler(getJobRequirementById))
  .put("/:id", authenticateToken,
    dynamicUpload([{ name: "jobDescriptionUrl", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(updateJobRequirementById))
  .delete("/:id", authenticateToken, asyncHandler(deleteJobRequirementById))

export default router;
