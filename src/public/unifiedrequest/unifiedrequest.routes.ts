import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { UnifiedRequestController } from "./unifiedrequest.controller";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";
import { authorizeFeature } from "../../middlewares/enrollMiddleware";

const {
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
  .delete("/:id", authenticateToken, asyncHandler(deleteUnifiedRequestById));

export default router;
