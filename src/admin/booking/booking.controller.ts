import mongoose from "mongoose";
import { Request, Response } from "express";
import ApiError from "../../utils/ApiError";
import { Slot } from "../../modals/slot.model";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { Booking } from "../../modals/booking.model";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { CommonService } from "../../services/common.services";
import { PersonalAssistant } from "../../modals/personalassistant.model";
import { PlanFeatureMapping } from "../../modals/planfeaturemapping.model";

const bookingService = new CommonService(Booking);

const exactAmount = async (userId: any) => {
  const enrolledPlan = await EnrolledPlan.findOne({ user: userId, status: "active" });
  const planId = enrolledPlan?.plan;

  let amount = 549;
  if (planId) {
    const mapping = await PlanFeatureMapping.findOne({
      planId,
      isEnabled: "active",
    });
    if (mapping) amount = mapping.amount;
  }
  return {
    amount,
    hasActivePlan: !!enrolledPlan,
  }
}

export const createBooking = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const { id: user } = (req as any).user;
    const { assistantId, slotId, amount } = req.body;
    if (!assistantId || !slotId) {
      return res
        .status(400)
        .json(new ApiError(400, "userId, assistantId, slotId are required"));
    }

    const exact = await exactAmount(user);
    if (amount !== exact.amount)
      return res
        .status(400)
        .json(new ApiError(400, "Amount mismatch. Don't be oversmart!"));

    await session.withTransaction(async () => {
      const slotDoc = await Slot.findOne({ user: assistantId }).session(session);
      if (!slotDoc) throw new ApiError(404, "Slot document not found");

      const ts: any = slotDoc.timeslots.find((slot: any) => slot?._id.toString() === slotId.toString());
      if (!ts) throw new ApiError(404, "Timeslot not found");
      if (ts.isBooked) throw new ApiError(400, "Timeslot already booked");

      ts.isBooked = true;
      ts.bookedBy = user;
      await slotDoc.save({ session });

      const booking = await Booking.create(
        [{
          user,
          timeslotId: ts._id,
          totalAmount: amount,
          assistant: assistantId,
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

      booking.timeslotId = newTs._id;
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

export const updateBooking = async (req: Request, res: Response) => {
  try {
    const { status, paymentStatus, bookingId, paymentDetails } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new ApiError(404, "Booking not found");

    // If already paid, return complete booking data
    if (booking.paymentStatus === "success") {
      return res.status(200).json(
        new ApiResponse(200, {
          message: "Booking already paid",
          booking,
        })
      );
    }

    // Update fields if provided
    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (paymentDetails) booking.paymentDetails = paymentDetails;

    // Fetch and attach metadata
    const [user, assistant] = await Promise.all([
      User.findById(booking.user).select("name email phoneNumber"),
      PersonalAssistant.findById(booking.assistant).select("name email expertise"),
    ]);

    const slotDoc = await Slot.findOne({ user: booking.assistant });
    if (!slotDoc) throw new ApiError(404, "Slot document not found");
    const ts: any = slotDoc.timeslots.find((slot: any) => slot?._id.toString() === booking?.timeslotId.toString());
    booking.metaDetails = {
      user,
      assistant,
      timeslot: ts,
    };
    await booking.save();
    return res.status(200).json(new ApiResponse(200, booking, "Booking updated successfully"));
  } catch (err: any) {
    const status = err instanceof ApiError ? err.statusCode : 500;
    return res.status(status).json(new ApiError(status, err.message));
  }
};
