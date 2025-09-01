import express from "express";
import { InviteController } from "./invite.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  asyncHandler(InviteController.sendInvite)
);
router.get(
  "/send",
  authenticateToken,
  asyncHandler(InviteController.getSentInvites)
);
router.get(
  "/receive",
  authenticateToken,
  asyncHandler(InviteController.getReceivedInvites)
);
router.delete(
  "/:inviteId",
  authenticateToken,
  asyncHandler(InviteController.deleteInvite)
);

export default router;
