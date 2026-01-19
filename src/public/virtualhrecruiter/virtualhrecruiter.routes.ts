import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { VirtualHrRecruiterController } from "./virtualhrecruiter.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  updateStatus,
  assignVirtualHR,
  assignSalesPerson,
  createVirtualHrRecruiter,
  getAllVirtualHrRecruiters,
  getVirtualHrRecruiterById,
  updateVirtualHrRecruiterById,
  deleteVirtualHrRecruiterById,
} = VirtualHrRecruiterController;

const router = express.Router();

router
  .post("/",
    authenticateToken,
    dynamicUpload([{ name: "jobDescriptionUrl", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(createVirtualHrRecruiter))
  .get("/", authenticateToken, asyncHandler(getAllVirtualHrRecruiters))
  .get("/:id", authenticateToken, asyncHandler(getVirtualHrRecruiterById))
  .put("/:id", authenticateToken,
    dynamicUpload([{ name: "jobDescriptionUrl", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(updateVirtualHrRecruiterById))
  .delete("/:id", authenticateToken, asyncHandler(deleteVirtualHrRecruiterById))
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
