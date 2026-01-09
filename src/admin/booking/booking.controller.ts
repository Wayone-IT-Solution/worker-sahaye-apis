import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import { User } from "../../modals/user.model";
import { Slot } from "../../modals/slot.model";
import ApiResponse from "../../utils/ApiResponse";
import { Booking } from "../../modals/booking.model";
import { NextFunction, Request, Response } from "express";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { CommonService } from "../../services/common.services";
import { PersonalAssistant } from "../../modals/personalassistant.model";
import { PlanFeatureMapping } from "../../modals/planfeaturemapping.model";
import { SubscriptionPlan, PlanType } from "../../modals/subscriptionplan.model";

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

export const getExactAmount = async (req: Request, res: Response) => {
  try {
    const { id: userId } = (req as any).user;
    if (!userId) return res.status(400).json({ success: false, message: "UserId is required" });

    const result = await exactAmount(userId);
    return res.status(200).json({ success: true, data: result, });
  } catch (error: any) {
    console.log("Error fetching exact amount:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
    });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const { id: user } = (req as any).user;
    const { assistantId, slotId, amount, supportServiceId, serviceLocationId, userLocation } = req.body;
    if (!assistantId || !slotId) {
      return res
        .status(400)
        .json(new ApiError(400, "assistantId, slotId are required"));
    }

    const exact = await exactAmount(user);
    if (amount !== exact.amount)
      return res
        .status(400)
        .json(new ApiError(400, "Amount mismatch. Don't be oversmart!"));

    await session.withTransaction(async () => {
      const slotDoc = await Slot.findOne({ user: assistantId }).session(
        session
      );
      if (!slotDoc) throw new ApiError(404, "Slot document not found");

      const ts: any = slotDoc.timeslots.find(
        (slot: any) => slot?._id.toString() === slotId.toString()
      );
      if (!ts) throw new ApiError(404, "Timeslot not found");
      if (ts.isBooked) throw new ApiError(400, "Timeslot already booked");

      ts.isBooked = true;
      ts.bookedBy = user;
      await slotDoc.save({ session });

      const [userData, assistant]: any = await Promise.all([
        User.findById(user).select("fullName email mobile"),
        PersonalAssistant.findById(assistantId).select(
          "name email phoneNumber"
        ),
      ]);
      const metaDetails = { user: userData, assistant, timeslot: ts };
      const booking = await Booking.create(
        [
          {
            user,
            timeslotId: ts._id,
            totalAmount: amount,
            assistant: assistantId,
            supportService: supportServiceId || null,
            serviceLocationId: serviceLocationId || null,
            userLocation: userLocation || null,
            canCall: true,
            metaDetails: metaDetails,
          },
        ],
        { session }
      );
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            booking[0],
            "Booking created & slot marked booked"
          )
        );
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
        .json(
          new ApiError(400, "bookingId, newSlotId, assistantId are required")
        );
    }

    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) throw new ApiError(404, "Booking not found");

      // 1) Un-book old slot
      const slotDoc = await Slot.findOne({ user: assistantId }).session(
        session
      );
      if (!slotDoc) throw new ApiError(404, "Slot document not found");

      const oldTs: any = slotDoc.timeslots.find(
        (slot: any) => slot?._id.toString() === booking.timeslotId.toString()
      );
      if (oldTs) {
        oldTs.isBooked = false;
        oldTs.bookedBy = null;
      }

      // 2) Book new slot
      const newTs: any = slotDoc.timeslots.find(
        (slot: any) => slot?._id.toString() === newSlotId.toString()
      );
      if (!newTs) throw new ApiError(404, "New timeslot not found");

      if (newTs.isBooked)
        throw new ApiError(400, "New timeslot already booked");

      newTs.isBooked = true;
      newTs.bookedBy = booking.user;
      await slotDoc.save({ session });

      booking.timeslotId = newTs._id;
      await booking.save({ session });

      return res
        .status(200)
        .json(
          new ApiResponse(200, booking, "Booking slot updated successfully")
        );
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
      User.findById(booking.user).select("fullName email mobile"),
      PersonalAssistant.findById(booking.assistant).select(
        "name email phoneNumber"
      ),
    ]);

    const slotDoc = await Slot.findOne({ user: booking.assistant });
    if (!slotDoc) throw new ApiError(404, "Slot document not found");
    const ts: any = slotDoc.timeslots.find(
      (slot: any) => slot?._id.toString() === booking?.timeslotId.toString()
    );
    booking.metaDetails = {
      user,
      assistant,
      timeslot: ts,
    };
    await booking.save();
    return res
      .status(200)
      .json(new ApiResponse(200, booking, "Booking updated successfully"));
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

// Mark call as used - set canCall to false
export const markCallAsUsed = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { id: userId } = (req as any).user;

    if (!bookingId) {
      return res
        .status(400)
        .json(new ApiError(400, "bookingId is required"));
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json(new ApiError(404, "Booking not found"));
    }

    // Verify that the user making the call is the one who booked it
    if (booking.user.toString() !== userId) {
      return res
        .status(403)
        .json(new ApiError(403, "Unauthorized - This booking is not yours"));
    }

    // Check if call is already used
    if (!booking.canCall) {
      return res
        .status(400)
        .json(new ApiError(400, "Call opportunity already used for this booking"));
    }

    // Mark call as used
    booking.canCall = false;
    await booking.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200, booking, "Call marked as used successfully")
      );
  } catch (error: any) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res
      .status(status)
      .json(new ApiError(status, error.message || "Error marking call as used"));
  }
};

// Get canCall status for a support service
export const getServiceCallStatus = async (req: Request, res: Response) => {
  try {
    const { id: userId } = (req as any).user;
    const { serviceId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json(new ApiError(400, "User not authenticated"));
    }

    if (!serviceId) {
      return res
        .status(400)
        .json(new ApiError(400, "serviceId is required"));
    }

    // Find booking for this user and service
    const booking = await Booking.findOne({
      user: userId,
      supportService: serviceId,
      status: { $ne: "cancelled" },
    });

    if (!booking) {
      return res
        .status(404)
        .json(new ApiError(404, "No booking found for this service"));
    }

    // Check if user has active premium/enterprise/professional subscription
    const enrolledPlan = await EnrolledPlan.findOne({
      user: userId,
      status: "active",
    }).populate("plan");

    const premiumPlanTypes = [PlanType.PREMIUM, PlanType.ENTERPRISE, PlanType.PROFESSIONAL];
    const hasActiveSubscription = enrolledPlan && premiumPlanTypes.includes((enrolledPlan.plan as any).planType);

    // Return canCall status, serviceId, bookingId, and hasActiveSubscription
    return res
      .status(200)
      .json(
        new ApiResponse(200, {
          bookingId: booking._id,
          serviceId: booking.supportService,
          canCall: booking.canCall,
          hasActiveSubscription: hasActiveSubscription || false,
        }, "Service call status fetched successfully")
      );
  } catch (error: any) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res
      .status(status)
      .json(new ApiError(status, error.message || "Error fetching service call status"));
  }
};