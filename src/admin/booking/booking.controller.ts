import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { Booking } from "../../modals/booking.model";
import { NextFunction, Request, Response } from "express";
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
    const mapping = await PlanFeatureMapping.findOne({ planId, isEnabled: "active" });
    if (mapping) amount = mapping.amount;
  }
  return { amount, hasActivePlan: !!enrolledPlan };
};

export const createBooking = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const { id: user } = (req as any).user;
    const { amount, date, startTime, endTime, duration } = req.body;

    const exact = await exactAmount(user);
    if (amount !== exact.amount)
      return res.status(400).json(new ApiError(400, "Amount mismatch. Don't be oversmart!"));

    await session.withTransaction(async () => {
      const ts = { date, startTime, endTime, duration, isBooked: true, bookedBy: user };
      const userData = await User.findById(user).select("fullName email mobile");

      const metaDetails = { user: userData, timeslot: ts };

      const booking = await Booking.create([{ user, totalAmount: amount, metaDetails }], {
        session,
      });

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
    const { date, startTime, endTime, duration } = req.body;

    if (!bookingId) {
      return res.status(400).json(new ApiError(400, "bookingId is required"));
    }

    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) throw new ApiError(404, "Booking not found");

      const ts = { date, startTime, endTime, duration, isBooked: true };
      booking.metaDetails = { ...booking.metaDetails, timeslot: ts };

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

export const getAllBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await bookingService.getAll(req.query);
    return res.status(200).json(new ApiResponse(200, result, "Data fetched successfully"));
  } catch (err) {
    next(err);
  }
};

export const getBookingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await bookingService.getById(req.params.id);
    if (!result) return res.status(404).json(new ApiError(404, "Booking not found"));
    return res.status(200).json(new ApiResponse(200, result, "Data fetched successfully"));
  } catch (err) {
    next(err);
  }
};

export const getUserBookings = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const bookings = await bookingService.getAll({ ...req.query, user: userId });
    res.status(200).json(new ApiResponse(200, bookings, "User bookings"));
  } catch (error: any) {
    res.status(500).json(new ApiError(500, "Failed to fetch user bookings", error.message));
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const { bookingId } = req.params;

    const bookingData = await Booking.findById(bookingId);
    if (!bookingData) throw new ApiError(404, "Booking not found");
    if (bookingData.paymentStatus !== "success")
      throw new ApiError(400, "Booking must have payment status: 'SUCCESS'");

    const booking = await Booking.findByIdAndUpdate(bookingId, { status }, { new: true });
    res.status(200).json(new ApiResponse(200, booking, "Booking status updated"));
  } catch (error: any) {
    res.status(500).json(new ApiError(500, "Failed to update booking status", error.message));
  }
};

export const updateBooking = async (req: Request, res: Response) => {
  try {
    const { status, paymentStatus, bookingId, paymentDetails } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new ApiError(404, "Booking not found");

    if (booking.paymentStatus === "success") {
      return res.status(200).json(
        new ApiResponse(200, { message: "Booking already paid", booking })
      );
    }

    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (paymentDetails) booking.paymentDetails = paymentDetails;

    await booking.save();
    return res.status(200).json(new ApiResponse(200, booking, "Booking updated successfully"));
  } catch (err: any) {
    const status = err instanceof ApiError ? err.statusCode : 500;
    return res.status(status).json(new ApiError(status, err.message));
  }
};

export const assignAssistant = async (req: Request, res: Response) => {
  try {
    const { bookingId, assistantId } = req.params;
    if (!bookingId || !assistantId) {
      return res.status(400).json(new ApiError(400, "bookingId and assistantId are required"));
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.paymentStatus !== "success")
      throw new ApiError(400, "Cannot assign assistant before payment success");

    const assistant = await PersonalAssistant.findById(assistantId).select(
      "name email phoneNumber"
    );
    if (!assistant) throw new ApiError(404, "Assistant not found");

    booking.assistant = new mongoose.Types.ObjectId(assistantId);
    booking.metaDetails = { ...booking.metaDetails, assistant };
    await booking.save();

    res.status(200).json(new ApiResponse(200, booking, "Assistant assigned successfully"));
  } catch (err: any) {
    const status = err instanceof ApiError ? err.statusCode : 500;
    res.status(status).json(new ApiError(status, err.message));
  }
};

export const getAssistantBookings = async (req: Request, res: Response) => {
  try {
    const { assistantId } = req.params;
    if (!assistantId)
      return res.status(400).json(new ApiError(400, "assistantId is required"));

    const bookings = await bookingService.getAll({ ...req.query, assistant: assistantId });
    res
      .status(200)
      .json(new ApiResponse(200, bookings, "Assistant bookings fetched successfully"));
  } catch (error: any) {
    res
      .status(500)
      .json(new ApiError(500, "Failed to fetch assistant bookings", error.message));
  }
};