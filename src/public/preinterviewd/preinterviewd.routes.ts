import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { PreInterviewedController } from "./preinterviewd.controller";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  createPreInterviewed,
  getAllPreIntervieweds,
  getPreInterviewedById,
  updatePreInterviewedById,
  deletePreInterviewedById,
  getPreInterviewedDetails
} = PreInterviewedController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllPreIntervieweds))
  .get("/:id", authenticateToken, asyncHandler(getPreInterviewedById))
  .put("/:id",
    authenticateToken,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("verification"),
    asyncHandler(updatePreInterviewedById))
  .delete("/:id", authenticateToken, asyncHandler(deletePreInterviewedById))
  .post("/",
    authenticateToken,
    isWorker,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("verification"),
    asyncHandler(createPreInterviewed))
  .patch("/", authenticateToken, isWorker, asyncHandler(getPreInterviewedDetails));

export default router;
