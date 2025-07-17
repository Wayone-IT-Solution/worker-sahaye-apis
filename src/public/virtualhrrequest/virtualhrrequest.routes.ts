import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authorizeFeature } from "../../middlewares/enrollMiddleware";
import { VirtualHRRequestController } from "./virtualhrrequest.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  updateStatus,
  assignVirtualHR,
  createVirtualHRRequest,
  getAllVirtualHRRequests,
  getVirtualHRRequestById,
  updateVirtualHRRequestById,
  deleteVirtualHRRequestById,
} = VirtualHRRequestController;

const router = express.Router();

router
  .post("/",
    authenticateToken,
    authorizeFeature("virtual_hr_request"),
    dynamicUpload([{ name: "jobDescriptionUrl", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(createVirtualHRRequest))
  .get("/", authenticateToken, authorizeFeature("virtual_hr_request"), asyncHandler(getAllVirtualHRRequests))
  .get("/:id", authenticateToken, asyncHandler(getVirtualHRRequestById))
  .put("/:id", authenticateToken,
    authorizeFeature("virtual_hr_request"),
    dynamicUpload([{ name: "jobDescriptionUrl", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(updateVirtualHRRequestById))
  .delete("/:id", authenticateToken, asyncHandler(deleteVirtualHRRequestById))
  .post(
    "/:id/assign",
    authenticateToken,
    isAdmin,
    asyncHandler(assignVirtualHR)
  )
  .patch(
    "/:id/update-status",
    authenticateToken,
    asyncHandler(updateStatus)
  )

export default router;
