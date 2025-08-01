import express from "express";
import {
  updateBooking,
  createBooking,
  getAllBookings,
  getBookingById,
  getUserBookings,
  updateBookingStatus,
  getAssistantBookings,
} from "./booking.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin, isWorker } from "../../middlewares/authMiddleware";

const router = express.Router();

router.get("/", authenticateToken, isAdmin, asyncHandler(getAllBookings));
router.put("/", authenticateToken, isWorker, asyncHandler(updateBooking));
router.post("/", authenticateToken, isWorker, asyncHandler(createBooking));
router.get("/:id", authenticateToken, isAdmin, asyncHandler(getBookingById));
router.get("/user/:userId", authenticateToken, asyncHandler(getUserBookings));
router.get("/status/:bookingId", authenticateToken, asyncHandler(updateBookingStatus));
router.get("/assistant/:assistantId", authenticateToken, asyncHandler(getAssistantBookings));

export default router;
