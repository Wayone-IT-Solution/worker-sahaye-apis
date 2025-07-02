import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { EndorsementController } from "./endorsement.controller";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";

const {
  createEndorsement,
  getAllEndorsements,
  getEndorsementById,
  deleteEndorsementById,
  updateEndorsementById,
  getAllEndorsementsGiven,
  getAllEndorsementsReceived
} = EndorsementController;

const router = express.Router();

router.get("/", authenticateToken, asyncHandler(getAllEndorsements));
router.get("/given/to", authenticateToken, asyncHandler(getAllEndorsementsGiven));
router.get("/received/from", authenticateToken, asyncHandler(getAllEndorsementsReceived));
router.post("/", authenticateToken, isWorker, asyncHandler(createEndorsement));
router.get("/:id", authenticateToken, asyncHandler(getEndorsementById));
router.put("/:id", authenticateToken, asyncHandler(updateEndorsementById));
router.delete("/:id", authenticateToken, asyncHandler(deleteEndorsementById));

export default router;
