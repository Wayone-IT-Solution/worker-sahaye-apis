import express from "express";
import {
  updateBooking,
  createBooking,
  getExactAmount,
  getAllBookings,
  getBookingById,
  assignAssistant,
  getUserBookings,
  changeBookingSlot,
  updateBookingStatus,
  getAssistantBookings,
} from "./booking.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  isAdmin,
  isWorker,
  authenticateToken,
} from "../../middlewares/authMiddleware";

const router = express.Router();

router.patch("/", authenticateToken, asyncHandler(getExactAmount));
router.get("/", authenticateToken, isAdmin, asyncHandler(getAllBookings));
router.put("/", authenticateToken, isWorker, asyncHandler(updateBooking));
router.post("/", authenticateToken, isWorker, asyncHandler(createBooking));
router.post("/:bookingId", authenticateToken, isWorker, asyncHandler(changeBookingSlot));
router.put(
  "/:bookingId",
  authenticateToken,
  isAdmin,
  asyncHandler(updateBookingStatus)
);
router.put(
  "/:bookingId/:assistantId",
  authenticateToken,
  isAdmin,
  asyncHandler(assignAssistant)
);
router.get(
  "/assistant/:assistantId",
  authenticateToken,
  isAdmin,
  asyncHandler(getAssistantBookings)
);
router.get("/user/:userId", authenticateToken, asyncHandler(getUserBookings));
router.get("/:id", authenticateToken, isAdmin, asyncHandler(getBookingById));

export default router;
