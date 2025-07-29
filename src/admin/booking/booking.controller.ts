import mongoose from "mongoose";
import { Request, Response } from "express";
import ApiError from "../../utils/ApiError";
import { Slot } from "../../modals/slot.model";
import ApiResponse from "../../utils/ApiResponse";
import { Booking } from "../../modals/booking.model";
import { CommonService } from "../../services/common.services";

const bookingService = new CommonService(Booking);

export const createBooking = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const { userId, assistantId, slotId, payment } = req.body;

    if (!userId || !assistantId || !slotId || !payment?.amount) {
      return res
        .status(400)
        .json(new ApiError(400, "userId, assistantId, slotId, amount are required"));
    }

    await session.withTransaction(async () => {
      const slotDoc = await Slot.findOne({ user: assistantId }).session(session);
      if (!slotDoc) throw new ApiError(404, "Slot document not found");

      const ts: any = slotDoc.timeslots.find((slot: any) => slot?._id.toString() === slotId.toString());
      if (!ts) throw new ApiError(404, "Timeslot not found");

      if (ts.isBooked) throw new ApiError(400, "Timeslot already booked");

      // 2) Mark booked
      ts.isBooked = true;
      ts.bookedBy = userId;
      await slotDoc.save({ session });

      // 3) Create booking
      const booking = await Booking.create(
        [{
          user: userId,
          date: ts.date,
          status: "pending",
          timeslotId: ts._id,
          endTime: ts.endTime,
          assistant: assistantId,
          startTime: ts.startTime,
        }],
        { session }
      );
      return res
        .status(201)
        .json(new ApiResponse(201, booking[0], "Booking created & slot marked booked"));
    });
  } catch (err: any) {
    const status = err instanceof ApiError ? err.statusCode : 500;
    return res.status(status).json(new ApiError(status, err.message));
  } finally {
    session.endSession();
  }
};

export const changeBookingSlot = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const { bookingId } = req.params;
    const { newSlotId, assistantId } = req.body;

    if (!bookingId || !newSlotId || !assistantId) {
      return res
        .status(400)
        .json(new ApiError(400, "bookingId, newSlotId, assistantId are required"));
    }

    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) throw new ApiError(404, "Booking not found");

      // 1) Un-book old slot
      const slotDoc = await Slot.findOne({ user: assistantId }).session(session);
      if (!slotDoc) throw new ApiError(404, "Slot document not found");

      const oldTs: any = slotDoc.timeslots.find((slot: any) => slot?._id.toString() === booking.timeslotId.toString());
      if (oldTs) {
        oldTs.isBooked = false;
        oldTs.bookedBy = null;
      }

      // 2) Book new slot
      const newTs: any = slotDoc.timeslots.find((slot: any) => slot?._id.toString() === newSlotId.toString());
      if (!newTs) throw new ApiError(404, "New timeslot not found");

      if (newTs.isBooked) throw new ApiError(400, "New timeslot already booked");

      newTs.isBooked = true;
      newTs.bookedBy = booking.user;
      await slotDoc.save({ session });

      // 3) Update booking with new slot data
      booking.date = newTs.date;
      booking.timeslotId = newTs._id;
      booking.endTime = newTs.endTime;
      booking.startTime = newTs.startTime;

      await booking.save({ session });

      return res
        .status(200)
        .json(new ApiResponse(200, booking, "Booking slot updated successfully"));
    });
  } catch (err: any) {
    const status = err instanceof ApiError ? err.statusCode : 500;
    return res.status(status).json(new ApiError(status, err.message));
  } finally {
    session.endSession();
  }
};

export const getUserBookings = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const bookings = await bookingService.getAll({ ...req.query, user: userId });
    res.status(200).json(new ApiResponse(200, bookings, "User bookings"));
  } catch (error: any) {
    res
      .status(500)
      .json(new ApiError(500, "Failed to fetch user bookings", error.message));
  }
};

export const getAssistantBookings = async (req: Request, res: Response) => {
  try {
    const { assistantId } = req.params;
    const bookings = await bookingService.getAll({ ...req.body, assistant: assistantId });
    res
      .status(200)
      .json(new ApiResponse(200, bookings, "Assistant bookings"));
  } catch (error: any) {
    res.status(500).json(
      new ApiError(
        500,
        "Failed to fetch assistant bookings",
        error.message
      )
    );
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const { bookingId } = req.params;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json(new ApiError(404, "Booking not found"));
    }
    res
      .status(200)
      .json(new ApiResponse(200, booking, "Booking status updated"));
  } catch (error: any) {
    res
      .status(500)
      .json(new ApiError(500, "Failed to update booking status", error.message));
  }
};
