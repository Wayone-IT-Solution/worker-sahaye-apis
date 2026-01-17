import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { UnifiedRequestController } from "./unifiedrequest.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware, } from "../../middlewares/s3FileUploadMiddleware";

const {
  updateStatus,
  assignVirtualHR,
  assignSalesPerson,
  createUnifiedRequest,
  getAllUnifiedRequests,
  getUnifiedRequestById,
  updateUnifiedRequestById,
  deleteUnifiedRequestById,
} = UnifiedRequestController;

const router = express.Router();

router
  .post(
    "/",
    authenticateToken,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(createUnifiedRequest)
  )
  .get("/", authenticateToken, asyncHandler(getAllUnifiedRequests))
  .get("/:id", authenticateToken, asyncHandler(getUnifiedRequestById))
  .put(
    "/:id",
    authenticateToken,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(updateUnifiedRequestById)
  )
  .delete("/:id", authenticateToken, asyncHandler(deleteUnifiedRequestById))
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
