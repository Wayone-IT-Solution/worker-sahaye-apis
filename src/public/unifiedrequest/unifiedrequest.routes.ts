import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authorizeFeature } from "../../middlewares/enrollMiddleware";
import { UnifiedRequestController } from "./unifiedrequest.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware, } from "../../middlewares/s3FileUploadMiddleware";

const {
  assignVirtualHR,
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
    authorizeFeature("support_service"),
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(createUnifiedRequest)
  )
  .get("/", authenticateToken, authorizeFeature("support_service"), asyncHandler(getAllUnifiedRequests))
  .get("/:id", authenticateToken, asyncHandler(getUnifiedRequestById))
  .put(
    "/:id",
    authenticateToken,
    authorizeFeature("support_service"),
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
  );

export default router;
