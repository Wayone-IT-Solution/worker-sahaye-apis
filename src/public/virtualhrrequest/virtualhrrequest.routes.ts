import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { VirtualHRRequestController } from "./virtualhrrequest.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  updateStatus,
  assignVirtualHR,
  assignSalesPerson,
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
    dynamicUpload([{ name: "jobDescriptionUrl", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(createVirtualHRRequest))
  .get("/", authenticateToken, asyncHandler(getAllVirtualHRRequests))
  .get("/:id", authenticateToken, asyncHandler(getVirtualHRRequestById))
  .put("/:id", authenticateToken,
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
