import { Router } from "express";
import { UserController } from "./user.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";

const userRouter = Router();

// Public routes
userRouter.post("/", asyncHandler(UserController.createUser));
userRouter.post("/send-otp", asyncHandler(UserController.generateOtp));
userRouter.post("/verify-otp", asyncHandler(UserController.verifyOtp));
userRouter.put("/", authenticateToken, asyncHandler(UserController.updateUser));
userRouter.get(
  "/all",
  authenticateToken,
  asyncHandler(UserController.getAllUsers)
);
userRouter.get(
  "/",
  authenticateToken,
  asyncHandler(UserController.getCurrentUser)
);

export default userRouter;
