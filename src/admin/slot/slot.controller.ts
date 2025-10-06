import mongoose from "mongoose";
import { Request, Response } from "express";
import ApiError from "../../utils/ApiError";
import { addDays, startOfDay } from "date-fns";
import ApiResponse from "../../utils/ApiResponse";
import { Slot, TimeSlot } from "../../modals/slot.model";
import { PersonalAssistant } from "../../modals/personalassistant.model";

export const createSlots = async (request: Request, response: Response) => {
  const { dates, timeslots, user } = request.body;

  if (!dates || !user || !timeslots) {
    return response
      .status(400)
      .json(new ApiError(400, "All fields are required"));
  }

  // Check if therapist exists
  const agentExist = await PersonalAssistant.findById(user);
  if (!agentExist)
    return response
      .status(400)
      .json(new ApiError(400, "Agent doesn't Exists!"));

  const timeslotsArray: any = [];

  dates.forEach((date: any) => {
    timeslots.forEach((slot: any) => {
      timeslotsArray.push(
        new TimeSlot({
          date: date,
          bookedBy: null,
          isBooked: false,
          endTime: slot.endTime,
          startTime: slot.startTime,
        })
      );
    });
  });

  let savedSlots;
  const userExist = await Slot.findOne({ user });
  if (userExist) {
    savedSlots = await Slot.updateOne(
      { user },
      { $push: { timeslots: { $each: timeslotsArray } } }
    );
  } else {
    const slotDocument = {
      user, timeslots: timeslotsArray,
    };
    const slot = new Slot(slotDocument);
    savedSlots = await slot.save();
  }
  return response
    .status(200)
    .json(new ApiResponse(200, savedSlots, "Slots created successfully"));
};

export const getNextDaysSlots = async (request: Request, response: Response) => {
  try {
    const user = request.params.id;
    if (!user) {
      return response
        .status(400)
        .json(new ApiError(400, "User ID is required"));
    }

    const agentExist = await PersonalAssistant.findById(user);
    if (!agentExist) {
      return response
        .status(400)
        .json(new ApiError(400, "Agent doesn't Exists"));
    }

    const today = startOfDay(new Date());
    const nextDays = addDays(today, 30);
    const slots = await Slot.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(user),
          "timeslots.date": {
            $gte: today,
            $lte: nextDays,
          },
        },
      },
      { $unwind: "$timeslots" },
      { $match: { "timeslots.date": { $gte: today, $lte: nextDays } } },
      { $sort: { "timeslots.date": 1 } },
      { $group: { _id: "$_id", timeslots: { $push: "$timeslots" } } },
    ]);

    // if (!slots[0]?.timeslots.length) {
    //   return response
    //     .status(404)
    //     .json(
    //       new ApiError(404, "No slots available for the next 10 days")
    //     );
    // }
    return response
      .status(200)
      .json(new ApiResponse(200, slots[0], !slots[0]?.timeslots.length ? "No slots available for the next 10 days" : "Slots fetched successfully"));
  } catch (error: any) {
    return response
      .status(500)
      .json(new ApiError(500, error.message, "Failed to fetch slots"));
  }
};

export const deleteSlot = async (request: Request, response: Response) => {
  const { slot_id, user } = request.body;

  if (!slot_id || !user) {
    return response
      .status(400)
      .json(new ApiError(400, "Slot ID and User ID are required"));
  }
  try {
    const updatedData = await Slot.updateOne(
      { user: user, "timeslots._id": slot_id },
      { $pull: { timeslots: { _id: slot_id } } }
    );
    if (updatedData.modifiedCount > 0) {
      return response
        .status(200)
        .json(new ApiResponse(200, updatedData, "Slot deleted successfully"));
    } else {
      return response
        .status(404)
        .json(new ApiError(404, "Slot not found or no changes made"));
    }
  } catch (error: any) {
    return response
      .status(500)
      .json(new ApiError(500, "Internal Server Error", error));
  }
};

export const addMoreSlots = async (request: Request, response: Response) => {
  const { date, startTime, endTime, user } = request.body;

  if (!date || !startTime || !endTime)
    return response.status(400).json(new ApiError(400, "All fields are required"));

  try {
    const slot = await Slot.findOne({ user });
    if (!slot) return response.status(404).json(new ApiError(404, "Slot not found"));

    const timeslot = slot.timeslots.filter(
      (ts) => ts.date.toISOString().split("T")[0] === date
    );

    if (!timeslot || timeslot.length === 0)
      return response.status(404).json(new ApiError(404, "No timeslot found"));

    // Check for conflicts with existing timeslots
    const hasConflict = timeslot.some(
      (ts) => startTime < ts.endTime && endTime > ts.startTime
    );

    if (hasConflict)
      return response
        .status(400)
        .json(new ApiError(400, "Timeslot conflicts with existing timeslots"));

    const timeSlotDoc = new TimeSlot({
      endTime,
      startTime,
      date: date,
      isbooked: false,
      bookedBy: null,
    });

    slot.timeslots.push(timeSlotDoc);
    await slot.save();
    return response
      .status(200)
      .json(new ApiResponse(200, slot, "Timeslot added successfully"));
  } catch (error: any) {
    console.log("Error adding timeslot:", error);
    return response
      .status(500)
      .json(new ApiError(500, "Internal server error"));
  }
};

export const getSlotsByDate = async (request: Request, response: Response) => {
  const { user, date }: any = request.query;
  if (!user || !date) {
    return response
      .status(400)
      .json(new ApiError(400, "User ID and date are required"));
  }
  try {
    // Convert date to ISO format for comparison
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0); // Set time to 12:00 AM
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999); // Set time to 11:59 PM

    // Find the Slot document for the given user and date
    const slot = await Slot.findOne({
      user: user,
      "timeslots.date": {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    if (!slot) {
      return response.status(404).json(new ApiError(404, "No slots found "));
    }

    // Filter timeslots for the specified date
    const slotsForDay = slot.timeslots.filter(
      (ts) => ts.date >= startOfDay && ts.date < endOfDay
    );

    return response
      .status(200)
      .json(new ApiResponse(200, slotsForDay, "Slots retrieved successfully"));
  } catch (error: any) {
    console.log("Error retrieving slots:", error);
    return response
      .status(500)
      .json(new ApiError(500, "Internal server error"));
  }
};

export const getAllSlotsByDate = async (request: Request, response: Response) => {
  const { date }: any = request.query;

  if (!date) {
    return response
      .status(400)
      .json(new ApiError(400, "Date is required"));
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const now = new Date();

    // Check if given date is today
    const isToday =
      startOfDay.toDateString() === now.toDateString();

    // Fetch all slots for that day
    const slots = await Slot.find({
      "timeslots.date": {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    }).populate("user");

    if (!slots || slots.length === 0) {
      return response.status(404).json(new ApiError(404, "No slots found"));
    }

    // Map user-wise slots
    const result = slots
      .map((slot) => {
        const filteredSlots = slot.timeslots.filter((ts) => {
          if (isToday) return ts.date >= now && ts.date < endOfDay;
          else return ts.date >= startOfDay && ts.date < endOfDay;
        });
        return { user: slot.user, slots: filteredSlots };
      })
      .filter((s) => s.slots.length > 0);

    if (result.length === 0) {
      return response.status(404).json(new ApiError(404, "No slots available"));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, result, "Slots retrieved successfully"));
  } catch (error: any) {
    console.error("Error retrieving slots:", error);
    return response
      .status(500)
      .json(new ApiError(500, "Internal server error"));
  }
};
