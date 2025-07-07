import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { PoliceVerificationController } from "./policeverification.controller";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  createPoliceVerification,
  getAllPoliceVerifications,
  getPoliceVerificationById,
  updatePoliceVerificationById,
  deletePoliceVerificationById,
  getPoliceVerificationDetails
} = PoliceVerificationController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllPoliceVerifications))
  .get("/:id", authenticateToken, asyncHandler(getPoliceVerificationById))
  .put("/:id",
    authenticateToken,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("verification"),
    asyncHandler(updatePoliceVerificationById))
  .delete("/:id", authenticateToken, asyncHandler(deletePoliceVerificationById))
  .post("/",
    authenticateToken,
    isWorker,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("verification"),
    asyncHandler(createPoliceVerification))
  .patch("/", authenticateToken, isWorker, asyncHandler(getPoliceVerificationDetails));

export default router;
