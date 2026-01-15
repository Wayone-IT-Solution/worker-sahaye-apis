import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { NotificationController } from "./notification.controller";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

/**
 * ⭐ Send feedback request notification to a single worker
 * POST /api/notifications/send-feedback-request
 * Body: { workerId: string }
 * Auth: Required (Employer or Contractor)
 */
router.post(
  "/send-feedback-request",
  authenticateToken,
  asyncHandler(NotificationController.sendFeedbackRequest)
);

/**
 * ⭐ Send feedback request notifications to multiple workers
 * POST /api/notifications/send-feedback-request-bulk
 * Body: { workerIds: string[] }
 * Auth: Required (Employer or Contractor)
 */
router.post(
  "/send-feedback-request-bulk",
  authenticateToken,
  asyncHandler(NotificationController.sendFeedbackRequestBulk)
);

/**
 * 📬 Get all feedback request notifications for logged-in worker
 * GET /api/notifications/feedback-requests
 * Query: ?page=1&limit=10&status=unread (status: unread, read, all)
 * Auth: Required (Worker)
 */
router.get(
  "/feedback-requests",
  authenticateToken,
  asyncHandler(NotificationController.getFeedbackNotifications)
);

export default router;
