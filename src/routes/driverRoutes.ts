import { Router } from "express";
import {
  isAdmin,
  isDriver,
  authenticateToken,
} from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";
import { DriverController } from "../controllers/driverController";
import { virtualFilePathMiddleware } from "../middlewares/multerMiddleware";

const router = Router();

// ─── Public Routes ─────────────────────────────────────────────────────────────
router.post("/otp", asyncHandler(DriverController.generateOtp));
router.post("/register", asyncHandler(DriverController.createUser));
router.post(
  "/rider-register",
  authenticateToken,
  isAdmin,
  virtualFilePathMiddleware,
  asyncHandler(DriverController.createRider)
);
router.post("/verify-otp", asyncHandler(DriverController.verifyOtp));

// ─── Admin Route ───────────────────────────────────────────────────────────────
router.get(
  "/",
  authenticateToken,
  isAdmin,
  asyncHandler(DriverController.getAllDrivers)
);

router.get(
  "/current",
  authenticateToken,
  isDriver,
  asyncHandler(DriverController.getCurrentUser)
);

router.get(
  "/:id",
  authenticateToken,
  isAdmin,
  asyncHandler(DriverController.getDriverById)
);

router.delete(
  "/:id",
  authenticateToken,
  isAdmin,
  asyncHandler(DriverController.deleteDriverById)
);

// ─── Protected Driver Routes ────────────────────────────────────────────────────

router.put(
  "/",
  authenticateToken,
  virtualFilePathMiddleware,
  asyncHandler(DriverController.updateDriver)
);

export default router;
