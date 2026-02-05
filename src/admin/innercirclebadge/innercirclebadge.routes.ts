import { Router } from "express";
import { InnerCircleBadgeController } from "./innercirclebadge.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Badge Request Routes (User)
router.post(
  "/badge-requests",
  authenticateToken,
  asyncHandler(InnerCircleBadgeController.requestBadge)
);

router.get(
  "/my-badge-requests",
  authenticateToken,
  asyncHandler(InnerCircleBadgeController.getUserRequests)
);

router.delete(
  "/badge-requests/:id/cancel",
  authenticateToken,
  asyncHandler(InnerCircleBadgeController.cancelBadgeRequest)
);

// Badge Request Management Routes (Admin)
router.get(
  "/:userType",
  authenticateToken,
  isAdmin,
  asyncHandler(InnerCircleBadgeController.getAllRequests)
);

router.get(
  "/:userType/:id",
  authenticateToken,
  isAdmin,
  asyncHandler(InnerCircleBadgeController.getRequestById)
);

router.get(
  "/:userType/status/:status",
  authenticateToken,
  isAdmin,
  asyncHandler(InnerCircleBadgeController.getRequestsByStatus)
);

router.put(
  "/:id/approve",
  authenticateToken,
  isAdmin,
  asyncHandler(InnerCircleBadgeController.approveBadgeRequest)
);

router.put(
  "/:id/reject",
  authenticateToken,
  isAdmin,
  asyncHandler(InnerCircleBadgeController.rejectBadgeRequest)
);

export default router;
