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
userRouter.delete("/", authenticateToken, asyncHandler(UserController.deleteUserById));
userRouter.get("/otp/all", asyncHandler(UserController.getAllOtps));
userRouter.post("/send-otp", asyncHandler(UserController.generateOtp));
userRouter.post("/verify-otp", asyncHandler(UserController.verifyOtp));
userRouter.put("/", authenticateToken, asyncHandler(UserController.updateUser));
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