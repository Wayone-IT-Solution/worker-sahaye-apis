import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { VirtualHRRequestController } from "./virtualhrrequest.controller";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
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

export default router;
