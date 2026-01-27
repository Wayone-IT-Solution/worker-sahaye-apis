import { Router } from "express";
import { UserEngagementController } from "./userengagement.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const router = Router();

/**
 * @route GET /api/admin/userengagement/:userId
 * @desc Get comprehensive engagement details for a specific user
 * @access Admin only
 */
router.get(
    "/:userId",
    authenticateToken,
    UserEngagementController.getUserEngagementDetails
);

export default router;
