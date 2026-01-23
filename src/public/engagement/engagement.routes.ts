import express from "express";
import { EngagementController } from "./engagement.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";
import { checkEngagementLimit } from "../../middlewares/engagementLimitMiddleware";

const router = express.Router();

// Engagement routes
router.post(
  "/",
  authenticateToken,
  asyncHandler(checkEngagementLimit),
  asyncHandler(EngagementController.sendEngagement),
);
router.get(
  "/sent",
  authenticateToken,
  asyncHandler(EngagementController.getSentEngagements),
);
router.get(
  "/received",
  authenticateToken,
  asyncHandler(EngagementController.getReceivedEngagements),
);
router.delete(
  "/:engagementId",
  authenticateToken,
  asyncHandler(EngagementController.deleteEngagement),
);

// Backward compatibility routes for invites
router.post(
  "/invite",
  authenticateToken,
  asyncHandler(checkEngagementLimit),
  asyncHandler(EngagementController.sendInvite),
);
router.get(
  "/send",
  authenticateToken,
  asyncHandler(EngagementController.getSentInvites),
);
router.get(
  "/receive",
  authenticateToken,
  asyncHandler(EngagementController.getReceivedInvites),
);
router.delete(
  "/invite/:inviteId",
  authenticateToken,
  asyncHandler(EngagementController.deleteInvite),
);

export default router;
