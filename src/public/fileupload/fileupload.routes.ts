import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { FileUploadController } from "./fileupload.controller";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";
import { authenticateToken } from "../../middlewares/authMiddleware";

const { createFileUpload, getAllFileUploads, deleteFileUploadById } =
  FileUploadController;

const router = express.Router();

/**
 * @route   POST /api/fileupload
 * @desc    Upload files with optional name & tags (per file)
 * @access  Private (requires token)
 */
router.post(
  "/",
  authenticateToken,
  dynamicUpload([{ name: "files", maxCount: 10 }]), // accepts up to 10 files
  s3UploaderMiddleware("documents"), // upload to 'documents' folder in S3
  asyncHandler(createFileUpload)
);

router.get("/", authenticateToken, asyncHandler(getAllFileUploads));
router.delete("/", authenticateToken, asyncHandler(deleteFileUploadById));

export default router;
