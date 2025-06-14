import { Router } from "express";
import {
  isAdmin,
  isPassenger,
  authenticateToken,
} from "../middlewares/authMiddleware";
import {
  MessageController,
  getUniqueConversations,
} from "../controllers/messageController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// 💬 Passenger messages
router.post(
  "/",
  authenticateToken,
  isPassenger,
  asyncHandler(MessageController.createMessage)
);

// 🔍 Get message by ID (all authenticated users)
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(MessageController.getMessageById)
);

// 🔄 Get chat between passenger and driver
router.get(
  "/chat/:passengerId/:driverId",
  authenticateToken,
  asyncHandler(MessageController.getChatBetweenUsers)
);

// ✅ Mark messages as read
router.put(
  "/mark-read",
  authenticateToken,
  asyncHandler(MessageController.markMessagesAsRead)
);

// 🔐 Admin-only: Get unique conversations
router.get(
  "/",
  authenticateToken,
  isAdmin,
  asyncHandler(getUniqueConversations)
);

export default router;
