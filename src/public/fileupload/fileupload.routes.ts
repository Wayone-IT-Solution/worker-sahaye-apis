import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { FileUploadController } from "./fileupload.controller";

const {
  createFileUpload,
  getAllFileUploads,
  getFileUploadById,
  updateFileUploadById,
  deleteFileUploadById,
} = FileUploadController;

const router = express.Router();

router
  .post("/", asyncHandler(createFileUpload))
  .get("/", asyncHandler(getAllFileUploads))
  .get("/:id", asyncHandler(getFileUploadById))
  .put("/:id", asyncHandler(updateFileUploadById))
  .delete("/:id", asyncHandler(deleteFileUploadById));

export default router;
