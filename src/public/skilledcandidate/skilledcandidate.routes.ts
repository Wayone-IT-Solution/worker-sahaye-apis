import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { SkilledCandidateController } from "./skilledcandidate.controller";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  createSkilledCandidate,
  getAllSkilledCandidates,
  getSkilledCandidateById,
  updateSkilledCandidateById,
  deleteSkilledCandidateById,
  getSkilledCandidateDetails
} = SkilledCandidateController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllSkilledCandidates))
  .get("/:id", authenticateToken, asyncHandler(getSkilledCandidateById))
  .put("/:id",
    authenticateToken,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("verification"),
    asyncHandler(updateSkilledCandidateById))
  .delete("/:id", authenticateToken, asyncHandler(deleteSkilledCandidateById))
  .post("/",
    authenticateToken,
    isWorker,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("verification"),
    asyncHandler(createSkilledCandidate))
  .patch("/", authenticateToken, isWorker, asyncHandler(getSkilledCandidateDetails));

export default router;
