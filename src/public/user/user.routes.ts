import { Router } from "express";
import { UserController } from "./user.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";

const userRouter = Router();

// Public routes
userRouter.post("/", asyncHandler(UserController.createUser));
userRouter.post("/send-otp", asyncHandler(UserController.generateOtp));
userRouter.post("/verify-otp", asyncHandler(UserController.verifyOtp));

// Routes that require authentication
userRouter.get(
  "/current/user",
  authenticateToken,
  asyncHandler(UserController.getCurrentUser)
);

// Protect all routes below this middleware
// userRouter.use(authenticateToken);

userRouter
  .route("/:id")
  .get(asyncHandler(UserController.getUserById))
  .put(asyncHandler(UserController.updateUser));

export default userRouter;
