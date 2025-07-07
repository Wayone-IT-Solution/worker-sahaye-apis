import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { TrainedWorkerController } from "./trainedworker.controller";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  createTrainedWorker,
  getAllTrainedWorkers,
  getTrainedWorkerById,
  updateTrainedWorkerById,
  deleteTrainedWorkerById,
  getTrainedWorkerDetails
} = TrainedWorkerController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllTrainedWorkers))
  .get("/:id", authenticateToken, asyncHandler(getTrainedWorkerById))
  .put("/:id",
    authenticateToken,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("verification"),
    asyncHandler(updateTrainedWorkerById))
  .delete("/:id", authenticateToken, asyncHandler(deleteTrainedWorkerById))
  .post("/",
    authenticateToken,
    isWorker,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("verification"),
    asyncHandler(createTrainedWorker))
  .patch("/", authenticateToken, isWorker, asyncHandler(getTrainedWorkerDetails));

export default router;
