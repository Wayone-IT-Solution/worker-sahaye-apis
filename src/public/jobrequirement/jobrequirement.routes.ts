import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authorizeFeature } from "../../middlewares/enrollMiddleware";
import { JobRequirementController } from "./jobrequirement.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  updateStatus,
  assignVirtualHR,
  assignSalesPerson,
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
    authorizeFeature("on_demand_requirement"),
    dynamicUpload([{ name: "jobDescriptionUrl", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(createJobRequirement))
  .get("/", authenticateToken, authorizeFeature("on_demand_requirement"), asyncHandler(getAllJobRequirements))
  .get("/:id", authenticateToken, asyncHandler(getJobRequirementById))
  .put("/:id", authenticateToken,
    authorizeFeature("on_demand_requirement"),
    dynamicUpload([{ name: "jobDescriptionUrl", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(updateJobRequirementById))
  .delete("/:id", authenticateToken, asyncHandler(deleteJobRequirementById))
  .post(
    "/:id/assign",
    authenticateToken,
    isAdmin,
    asyncHandler(assignVirtualHR)
  )
  .post(
    "/:id/sales",
    authenticateToken,
    isAdmin,
    asyncHandler(assignSalesPerson)
  )
  .patch(
    "/:id/update-status",
    authenticateToken,
    asyncHandler(updateStatus)
  )

export default router;
