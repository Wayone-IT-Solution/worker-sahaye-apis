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
  getAllEndorsementsReceived,
  showPendingRequestsICanFulfill,
  showMyPendingEndorsementRequests,
  checkEndorsementEligibility
} = EndorsementController;

const router = express.Router();

// Check endorsement eligibility
router.get("/eligibility/check", authenticateToken, asyncHandler(checkEndorsementEligibility));

router.get("/", authenticateToken, asyncHandler(getAllEndorsements));

// Endorsements you have **given** to others
router.get("/given/to", authenticateToken, asyncHandler(getAllEndorsementsGiven));

// Endorsements you have **received** from others
router.get("/received/from", authenticateToken, asyncHandler(getAllEndorsementsReceived));

// Endorsement **requests you have sent** to others but they haven't fulfilled yet
router.get("/requests/sent", authenticateToken, asyncHandler(showMyPendingEndorsementRequests));

// Endorsement **requests you have received** but haven't fulfilled
router.get("/requests/received", authenticateToken, asyncHandler(showPendingRequestsICanFulfill));

router.post("/", authenticateToken, isWorker, asyncHandler(createEndorsement));
router.get("/:id", authenticateToken, asyncHandler(getEndorsementById));
router.put("/:id", authenticateToken, asyncHandler(updateEndorsementById));
router.delete("/:id", authenticateToken, asyncHandler(deleteEndorsementById));

export default router;
