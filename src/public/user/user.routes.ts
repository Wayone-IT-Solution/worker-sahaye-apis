import { Router } from "express";
import { UserController } from "./user.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { invalidateCacheAfterSuccess } from "../../middlewares/cacheMiddleware";
import {
  getAllNotifications,
  getNotificationStats,
  markNotificationRead,
} from "../../services/notification.service";

const userRouter = Router();

// Public routes
userRouter.post("/", invalidateCacheAfterSuccess("User", { logLabel: "user-create" }), asyncHandler(UserController.createUser));
userRouter.get("/filters", asyncHandler(UserController.getUserFilters));
userRouter.delete("/", authenticateToken, invalidateCacheAfterSuccess("User", { logLabel: "user-delete-self" }), asyncHandler(UserController.deleteUserById));
userRouter.get("/otp/all", asyncHandler(UserController.getAllOtps));
userRouter.post("/send-otp", asyncHandler(UserController.generateOtp));
userRouter.post("/admin/send-otp", asyncHandler(UserController.generateAdminOtp));
userRouter.post("/verify-otp", asyncHandler(UserController.verifyOtp));
userRouter.post("/admin/verify-otp", asyncHandler(UserController.verifyAdminOtp));
userRouter.post("/verify-email-otp", asyncHandler(UserController.verifyEmailOtp));
userRouter.put("/", authenticateToken, invalidateCacheAfterSuccess("User", { logLabel: "user-update-self" }), asyncHandler(UserController.updateUser));

// Admin: Early Access Badge Management
userRouter.post("/admin/early-access/:userId", invalidateCacheAfterSuccess("User", { logLabel: "user-early-access-grant" }), asyncHandler(UserController.grantEarlyAccessBadge));
userRouter.delete("/admin/early-access/:userId", invalidateCacheAfterSuccess("User", { logLabel: "user-early-access-revoke" }), asyncHandler(UserController.revokeEarlyAccessBadge));
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
userRouter.patch(
  "/admin/status/:id",
  authenticateToken,
  isAdmin,
  invalidateCacheAfterSuccess("User", { logLabel: "user-status-update" }),
  asyncHandler(UserController.updateUserStatusByAdmin)
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
