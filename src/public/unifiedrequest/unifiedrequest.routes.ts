import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { UnifiedRequestController } from "./unifiedrequest.controller";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";

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
  .delete("/:id", authenticateToken, asyncHandler(deleteUnifiedRequestById));

export default router;
