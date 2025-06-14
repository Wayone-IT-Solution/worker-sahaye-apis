import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { UserController } from "../controllers/userController";
import { authenticateToken, isAdmin } from "../middlewares/authMiddleware";

const userRouter = Router();

// Public routes
userRouter.post("/", asyncHandler(UserController.createUser));
userRouter.post("/login", asyncHandler(UserController.loginUser));
userRouter.get(
  "/current/user",
  authenticateToken,
  asyncHandler(UserController.getCurrentUser)
);

// Routes with authentication & admin check
userRouter.use(authenticateToken, isAdmin);

userRouter.route("/").get(asyncHandler(UserController.getAllAdmins)); // GET / (list users)

userRouter
  .route("/:id")
  .get(asyncHandler(UserController.getAdminById)) // GET /:id
  .put(asyncHandler(UserController.updateUser)); // PUT /:id

export default userRouter;
