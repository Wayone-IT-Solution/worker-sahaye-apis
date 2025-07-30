import express from "express";
import {
  updateBooking,
  createBooking,
  getUserBookings,
  updateBookingStatus,
  getAssistantBookings,
} from "./booking.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";

const router = express.Router();

router.put("/", authenticateToken, isWorker, asyncHandler(updateBooking));
router.post("/", authenticateToken, isWorker, asyncHandler(createBooking));
router.get("/user/:userId", authenticateToken, asyncHandler(getUserBookings));
router.get("/status/:bookingId", authenticateToken, asyncHandler(updateBookingStatus));
router.get("/assistant/:assistantId", authenticateToken, asyncHandler(getAssistantBookings));

export default router;
