import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { PassengerController } from "../controllers/passengerController";
import { authenticateToken, isPassenger } from "../middlewares/authMiddleware";

const passengerRouter = Router();

// Public routes
passengerRouter.put(
  "/",
  authenticateToken,
  isPassenger,
  asyncHandler(PassengerController.updateUser)
);
passengerRouter.post("/register", asyncHandler(PassengerController.createUser));
passengerRouter.post("/otp", asyncHandler(PassengerController.generateOtp));
passengerRouter.post(
  "/verify-otp",
  asyncHandler(PassengerController.verifyOtp)
);
passengerRouter.get("/", asyncHandler(PassengerController.getAllPassengers));
passengerRouter.put(
  "/update-status/:id",
  asyncHandler(PassengerController.toggleUserStatus)
);

// Protected route - requires authentication and passenger role
passengerRouter.get(
  "/current",
  authenticateToken,
  isPassenger,
  asyncHandler(PassengerController.getCurrentUser)
);

export default passengerRouter;
