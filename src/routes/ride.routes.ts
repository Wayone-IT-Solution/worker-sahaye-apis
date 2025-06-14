import express from "express";
import {
  startRide,
  createRide,
  cancelRide,
  acceptRide,
  rejectRide,
  getAllRides,
  completeRide,
  getUserRides,
  reassignDriver,
  getRideDetails,
  markDriverReached,
  getDriverAssignedRides,
} from "../controllers/ride.controller";
import {
  isAdmin,
  isDriver,
  isPassenger,
  authenticateToken,
} from "../middlewares/authMiddleware";

const router = express.Router();

// ───── PASSENGER ROUTES ────────────────────────────────
router.post("/", authenticateToken, isPassenger, createRide);
router.get("/user", authenticateToken, isPassenger, getUserRides);
router.get("/detail", authenticateToken, isPassenger, getRideDetails);
router.post("/cancel/:rideId", authenticateToken, isPassenger, cancelRide);

// ───── DRIVER ROUTES ────────────────────────────────
router.get(
  "/driver/rides",
  authenticateToken,
  isDriver,
  getDriverAssignedRides
);
router.post("/accept/:rideId", authenticateToken, isDriver, acceptRide);
router.post("/reject/:rideId", authenticateToken, isDriver, rejectRide);
router.post("/start/:rideId", authenticateToken, isDriver, startRide);
router.post("/complete/:rideId", authenticateToken, isDriver, completeRide);
router.post("/reached/:rideId", authenticateToken, isDriver, markDriverReached);

// ───── ADMIN ROUTES ────────────────────────────────
router.post(
  "/reassign-driver/:rideId",
  authenticateToken,
  isAdmin,
  reassignDriver
);
router.get("/", authenticateToken, isAdmin, getAllRides);

export default router;
