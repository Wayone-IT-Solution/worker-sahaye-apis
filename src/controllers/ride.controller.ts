import mongoose, { Types } from "mongoose";
import { Request, Response } from "express";
import Passenger from "../modals/passengerModal";
import { Ride, RideStatus } from "../modals/rideModel";
import {
  getPipeline,
  paginationResult,
  calculateDistance,
} from "../utils/helper";
import Driver from "../modals/driverModal";
import ApiResponse from "../utils/ApiResponse";
import { getFareByDistance } from "./fare.controller";
import { getSurgeMultiplier } from "../modals/surgePricing.model";
import { NotificationService } from "../services/notification.service";
import { RatingReview } from "../modals/ratingReviewModel";

export const createRide = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const { pickup, drops, vehicleType, paymentMode } = req.body;
  const userId = req.user?.id;

  if (!vehicleType)
    return res
      .status(404)
      .json({ success: false, message: "Vehicle type not found" });

  const userExist = await Passenger.findById({ _id: userId });
  if (!userExist) return res.status(404).json({ message: "User not found" });

  const rideExist: any = await Ride.findOne({
    user: userId,
    status: {
      $in: [RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.ONGOING],
    },
  });

  if (rideExist) {
    return res.status(400).json({
      success: false,
      status: rideExist.status,
      activeRideId: rideExist._id,
      message: "User already has an active ride in progress",
    });
  }

  if (!pickup || !drops || !Array.isArray(drops) || drops.length === 0) {
    return res
      .status(400)
      .json({ message: "Pickup and at least one drop point are required" });
  }

  if (
    !pickup.address ||
    !pickup.coordinates ||
    pickup.coordinates.length !== 2
  ) {
    return res.status(400).json({
      message:
        "Invalid pickup location data (address and coordinates are required)",
    });
  }

  for (let i = 0; i < drops.length; i++) {
    if (
      !drops[i].address ||
      !drops[i].coordinates ||
      drops[i].coordinates.length !== 2
    ) {
      return res
        .status(400)
        .json({ message: `Invalid drop point data at index ${i}` });
    }
  }

  try {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newRide = await Ride.create({
      drops,
      pickup,
      vehicleType,
      paymentMode,
      pin: otpCode,
      user: userId,
      status: RideStatus.REQUESTED,
    });

    await NotificationService.send(
      {
        toRole: "passenger",
        type: "trip-requested",
        title: "Ride Requested",
        toUserId: req.user._id.toString(),
        message:
          "Your ride request has been received. We're finding a nearby driver for you.",
      },
      { id: req.user._id, role: req.user.role }
    );

    return res.status(201).json({
      ride: newRide,
      success: true,
      message: "Ride request created successfully",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to create ride", error: err });
  }
};

export const getUserRides = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const userId = req.user?.id;
  const userExist = await Passenger.findById({ _id: userId });
  if (!userExist) return res.status(404).json({ message: "User not found" });

  try {
    const rides = await Ride.find({ user: userId }).sort({ createdAt: -1 });
    if (!rides || rides.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No rides found for this user",
        rides: [],
      });
    }

    return res.status(200).json({
      success: true,
      total: rides.length,
      rides,
    });
  } catch (err) {
    console.error("Error fetching user rides:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rides",
      error: err instanceof Error ? err.message : err,
    });
  }
};

export const getRideDetails = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const { _id } = req.user;
  const { rideId } = req.query;

  try {
    let ride;
    let reviewDetails;

    if (rideId) {
      ride = await Ride.findOne({ _id: rideId, user: _id })
        .populate("driver")
        .populate("user");
      reviewDetails = await RatingReview.findOne({ rideId: rideId });
    } else {
      const latestRide = await Ride.findOne({ user: _id })
        .sort({ createdAt: -1 })
        .populate("driver")
        .populate("user");

      if (!latestRide) {
        return res.status(404).json({
          success: false,
          message: "No ride history found for your account.",
        });
      }
      ride = latestRide;
    }

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or you do not have permission to access it.",
      });
    }

    return res.status(200).json({
      ride,
      success: true,
      review: reviewDetails,
      message: "Ride details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching ride details:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while retrieving ride details.",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const cancelRide = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const { rideId } = req.params;
  const { cancelledBy, reason } = req.body;

  if (!rideId) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or missing ride ID" });
  }

  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message:
        "Cancellation reason is required and must be at least 3 characters long",
    });
  }

  if (!cancelledBy || !["user", "driver", "admin"].includes(cancelledBy)) {
    return res.status(400).json({
      success: false,
      message: "CancelledBy must be one of: user, driver, admin",
    });
  }

  try {
    const ride = await Ride.findById(rideId);

    if (!ride)
      return res
        .status(404)
        .json({ success: false, message: "Ride not found" });

    if (![RideStatus.REQUESTED, RideStatus.ACCEPTED].includes(ride.status)) {
      return res.status(400).json({
        success: false,
        message: `You can't modify the ride as it's already ${ride.status.toLowerCase()}.`,
      });
    }

    ride.status = RideStatus.CANCELLED;
    ride.cancelledBy = cancelledBy;
    ride.cancellationReason = reason.trim();
    ride.completedAt = new Date();

    await ride.save();

    if (!ride.driver)
      await NotificationService.send(
        {
          toRole: "passenger",
          type: "trip-cancelled",
          title: "Ride Cancelled",
          toUserId: req.user._id.toString(),
          message: `The passenger has cancelled the ride request.`,
        },
        { id: req.user._id, role: req.user.role }
      );

    return res.status(200).json({
      success: true,
      message: "Ride cancelled successfully",
      ride,
    });
  } catch (err) {
    console.error("Cancel ride error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while cancelling ride",
      error: err instanceof Error ? err.message : err,
    });
  }
};

export const getDriverAssignedRides = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const { id } = req.user;
  try {
    if (!id) return res.status(400).json({ message: "Invalid driver ID" });
    const rides = await Ride.find({ driver: id })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ rides, success: true });
  } catch (err: any) {
    return res.status(500).json({
      message: "Server error while fetching rides",
      error: err?.message || "Unknown error",
    });
  }
};

export const acceptRide = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const { rideId } = req.params;
  const driverId = req.user?.id;

  if (!rideId || !driverId) {
    return res.status(400).json({ message: "Invalid request parameters" });
  }

  try {
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (
      ride.status !== RideStatus.REQUESTED &&
      ride.status !== RideStatus.REJECTED
    ) {
      return res.status(400).json({
        message: `Ride is currently ${ride.status.toLowerCase()} and cannot be accepted`,
      });
    }

    if (ride.driver) {
      return res
        .status(409)
        .json({ message: "Ride already assigned to a driver" });
    }

    const driverExist: any = await Driver.findById({ _id: driverId });
    if (!driverExist)
      return res.status(404).json({ message: "Driver not found" });

    const totalDistance = ride.drops.reduce((sum, drop) => {
      return sum + calculateDistance(ride.pickup.coordinates, drop.coordinates);
    }, 0);
    const estimatedFare = await getFareByDistance(
      ride.vehicleType,
      totalDistance
    );

    const baseFare = estimatedFare + Number(ride.penaltyAmount || 0);
    const surgeMultiplier = await getSurgeMultiplier(totalDistance);

    ride.driver = driverId;
    ride.startedAt = new Date();
    ride.status = RideStatus.ACCEPTED;
    ride.distance = totalDistance.toFixed(1);
    const finalFare = baseFare * surgeMultiplier;
    ride.fare = finalFare;
    ride.penaltyAmount = 0;

    await ride.save();

    await NotificationService.send(
      {
        toRole: "passenger",
        type: "trip-accepted",
        title: "Trip Accepted",
        toUserId: ride.user.toString(),
        message: `Your ride has been accepted by driver ${driverExist?.name}.`,
      },
      { id: driverId, role: req.user.role }
    );

    return res
      .status(200)
      .json({ message: "Ride accepted successfully", ride });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error while accepting ride", error: err });
  }
};

export const rejectRide = async (req: Request, res: Response): Promise<any> => {
  const { rideId } = req.params;
  if (!rideId) return res.status(400).json({ message: "Ride ID is required" });

  try {
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (
      [
        RideStatus.ACCEPTED,
        RideStatus.COMPLETED,
        RideStatus.CANCELLED,
        RideStatus.ONGOING,
      ].includes(ride.status)
    ) {
      return res.status(400).json({
        message: `Ride cannot be rejected as it is already in the "${ride.status}" state.`,
        currentStatus: ride.status,
      });
    }

    if (ride.status !== RideStatus.REQUESTED) {
      return res.status(400).json({
        message: `Ride cannot be rejected as it is already in the "${ride.status}" state.`,
        currentStatus: ride.status,
      });
    }

    ride.status = RideStatus.REJECTED;
    await ride.save();

    return res
      .status(200)
      .json({ message: "Ride rejected successfully", ride });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({
      message: "Server error while rejecting the ride",
      error: err.message || "Unknown error",
    });
  }
};

export const startRide = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const { pin } = req.body;
  const { rideId } = req.params;

  try {
    if (!rideId)
      return res
        .status(400)
        .json({ success: false, message: "Ride ID is required" });

    const ride = await Ride.findById(rideId);
    if (!ride)
      return res
        .status(404)
        .json({ success: false, message: "Ride not found" });

    // Ride must be accepted before starting
    if (ride.status !== RideStatus.ACCEPTED) {
      return res.status(400).json({
        success: false,
        message: `Ride cannot be started as its current status is "${ride.status}". Only accepted rides can be started.`,
      });
    }

    if (!ride.driverReachedAt)
      return res.status(400).json({
        success: false,
        message: "Driver must reach the pickup point before starting the ride",
      });

    if (!pin || pin?.toString() !== ride.pin.toString())
      return res
        .status(400)
        .json({ success: false, message: "Pin is incorrect" });

    ride.status = RideStatus.ONGOING;
    ride.isPinVerified = true;
    ride.startedAt = new Date();

    await ride.save();

    const driverExist: any = await Driver.findById({ _id: ride.driver });
    if (!driverExist)
      return res.status(404).json({ message: "Driver not found" });

    await NotificationService.send(
      {
        toRole: "passenger",
        type: "trip-started",
        title: "Ride Started",
        toUserId: ride.user.toString(),
        message: `Your ride with driver ${driverExist?.name} has started. Enjoy your trip!`,
      },
      { id: req.user._id, role: req.user.role }
    );

    return res
      .status(200)
      .json({ success: true, message: "Ride started successfully", ride });
  } catch (err: any) {
    console.error("Error starting ride:", err);
    return res.status(500).json({
      message: "Server error while starting ride",
      error: err.message || "Unknown error",
    });
  }
};

export const completeRide = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const { id } = req.user;
  const { rideId } = req.params;
  const { paymentMode } = req.body;

  try {
    if (!paymentMode || typeof paymentMode !== "string") {
      return res
        .status(400)
        .json({ message: "Payment mode is required and must be a string" });
    }

    const ride: any = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    // Check ride status
    if (ride.status !== RideStatus.ONGOING) {
      return res.status(400).json({
        message: `Ride must be 'ongoing' to complete. Current status: ${ride.status}`,
      });
    }

    const driverExist: any = await Driver.findById({ _id: id });
    if (!driverExist)
      return res.status(404).json({ message: "Driver not found" });

    ride.status = RideStatus.COMPLETED;
    ride.completedAt = new Date();
    ride.paymentMode = paymentMode;
    driverExist.ridesCompleted += 1;

    await ride.save();
    await driverExist.save();

    await NotificationService.send(
      {
        toRole: "passenger",
        type: "trip-completed",
        title: "Ride Completed",
        toUserId: ride.user.toString(),
        message: `Your ride with driver ${driverExist?.name} has been successfully completed. We hope you had a great journey!`,
      },
      { id: req.user._id, role: req.user.role }
    );

    return res
      .status(200)
      .json({ message: "Ride completed", success: true, ride });
  } catch (err: any) {
    return res.status(500).json({
      message: "Server error while completing ride",
      error: err?.message || "Unknown error",
    });
  }
};

export const markDriverReached = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const { rideId } = req.params;
  try {
    if (!rideId)
      return res.status(400).json({ message: "Ride ID is required" });

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    // Check if the ride status is "ACCEPTED", as only accepted rides can have driver reached status marked
    if (![RideStatus.ACCEPTED].includes(ride.status)) {
      return res.status(400).json({
        message: `Cannot mark reached for this ride status, current status: "${ride.status}"`,
      });
    }
    const driverExist: any = await Driver.findById({ _id: ride.driver });
    if (!driverExist)
      return res.status(404).json({ message: "Driver not found" });

    ride.driverReachedAt = new Date();

    await NotificationService.send(
      {
        toRole: "passenger",
        type: "driver-reached",
        title: "Driver Arrived",
        toUserId: ride.user.toString(),
        message: `Your driver ${driverExist?.name} has arrived at your pickup location.`,
      },
      { id: req.user._id, role: req.user.role }
    );

    await ride.save();

    return res
      .status(200)
      .json({ message: "Driver marked as reached", ride, success: true });
  } catch (err: any) {
    console.error(err); // Log error for debugging purposes
    return res.status(500).json({
      message: "Server error while marking driver reached",
      error: err.message || "Unknown error",
    });
  }
};

export const reassignDriver = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { rideId } = req.params;
  const { newDriverId } = req.body;

  if (!Types.ObjectId.isValid(newDriverId)) {
    return res.status(400).json({ message: "Invalid driver ID" });
  }

  try {
    const ride = await Ride.findById(rideId);

    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (
      [RideStatus.COMPLETED, RideStatus.ONGOING, RideStatus.CANCELLED].includes(
        ride.status
      )
    ) {
      return res.status(400).json({
        message:
          "Cannot reassign driver for completed or cancelled or ongoing ride",
      });
    }

    ride.driver = new Types.ObjectId(newDriverId);
    ride.status = RideStatus.ACCEPTED;

    await ride.save();
    return res
      .status(200)
      .json({ message: "Driver reassigned", success: true, ride });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err });
  }
};

export const getAllRides = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10 }: any = req.query;
    const { pipeline, matchStage, options } = getPipeline(req.query);

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    pipeline.push(
      {
        $lookup: {
          from: "passengers",
          localField: "user",
          foreignField: "_id",
          as: "passengerInfo",
        },
      },
      {
        $unwind: {
          path: "$passengerInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "drivers",
          localField: "driver",
          foreignField: "_id",
          as: "driverInfo",
        },
      },
      {
        $unwind: {
          path: "$driverInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          fare: 1,
          status: 1,
          startedAt: 1,
          completedAt: 1,
          paymentMode: 1,
          driverReachedAt: 1,
          driverName: "$driverInfo.name",
          userName: "$passengerInfo.name",
          userPhone: "$passengerInfo.phoneNumber",
          driverPhoneNumber: "$driverInfo.phoneNumber",
          distance: {
            $concat: [
              {
                $toString: {
                  $round: [{ $toDouble: "$distance" }, 1],
                },
              },
              " km",
            ],
          },
          totalTime: {
            $concat: [
              {
                $cond: [
                  {
                    $gte: [
                      {
                        $floor: {
                          $divide: [
                            { $subtract: ["$completedAt", "$startedAt"] },
                            1000 * 60 * 60,
                          ],
                        },
                      },
                      1,
                    ],
                  },
                  {
                    $concat: [
                      {
                        $toString: {
                          $floor: {
                            $divide: [
                              { $subtract: ["$completedAt", "$startedAt"] },
                              1000 * 60 * 60,
                            ],
                          },
                        },
                      },
                      "h ",
                    ],
                  },
                  "",
                ],
              },
              {
                $concat: [
                  {
                    $toString: {
                      $mod: [
                        {
                          $floor: {
                            $divide: [
                              { $subtract: ["$completedAt", "$startedAt"] },
                              1000 * 60,
                            ],
                          },
                        },
                        60,
                      ],
                    },
                  },
                  "m",
                ],
              },
            ],
          },
        },
      }
    );
    const rides = await Ride.aggregate(pipeline, options);
    const totalrides = await Ride.countDocuments(
      Object.keys(matchStage).length > 0 ? matchStage : {}
    );

    const response = paginationResult(
      pageNumber,
      limitNumber,
      totalrides,
      rides
    );

    if (rides.length === 0)
      return res
        .status(200)
        .json(new ApiResponse(200, response, "No Rides found"));

    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to fetch rides", error: err });
  }
};
