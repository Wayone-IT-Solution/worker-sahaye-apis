import { Router } from "express";
import { UserController } from "./user.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import {
  getAllNotifications,
  getNotificationStats,
  markNotificationRead,
} from "../../services/notification.service";

const userRouter = Router();

// Public routes
userRouter.post("/", asyncHandler(UserController.createUser));
userRouter.get("/filters", asyncHandler(UserController.getUserFilters));
userRouter.delete("/", authenticateToken, asyncHandler(UserController.deleteUserById));
userRouter.get("/otp/all", asyncHandler(UserController.getAllOtps));
userRouter.post("/send-otp", asyncHandler(UserController.generateOtp));
userRouter.post("/admin/send-otp", asyncHandler(UserController.generateAdminOtp));
userRouter.post("/verify-otp", asyncHandler(UserController.verifyOtp));
userRouter.post("/admin/verify-otp", asyncHandler(UserController.verifyAdminOtp));
userRouter.post("/verify-email-otp", asyncHandler(UserController.verifyEmailOtp));
userRouter.put("/", authenticateToken, asyncHandler(UserController.updateUser));

// Admin: Early Access Badge Management
userRouter.post("/admin/early-access/:userId", asyncHandler(UserController.grantEarlyAccessBadge));
userRouter.delete("/admin/early-access/:userId", asyncHandler(UserController.revokeEarlyAccessBadge));
userRouter.get("/admin/early-access", asyncHandler(UserController.getEarlyAccessBadgeUsers));

// Get candidate branding eligibility based on subscription plan
userRouter.get("/branding/status", authenticateToken, asyncHandler(UserController.getCandidateBrandingStatus));

userRouter.get(
  "/all",
  authenticateToken,
  asyncHandler(UserController.getAllUsers)
);
userRouter.delete("/all/:id", asyncHandler(UserController.deleteUserById));
userRouter.get(
  "/all/:id",
  authenticateToken,
  asyncHandler(UserController.getUserForAdminById)
);
userRouter.post(
  "/all/notifications",
  authenticateToken,
  asyncHandler(getAllNotifications)
);
userRouter.patch(
  "/all/notifications-stats",
  authenticateToken,
  asyncHandler(getNotificationStats)
);
userRouter.put(
  "/mark-read",
  authenticateToken,
  asyncHandler(markNotificationRead)
);
userRouter.get(
  "/",
  authenticateToken,
  asyncHandler(UserController.getCurrentUser)
);
userRouter.get(
  "/:id",
  authenticateToken,
  asyncHandler(UserController.getUserById)
);

export default userRouter;