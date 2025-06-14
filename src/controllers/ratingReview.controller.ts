import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import { Ride, RideStatus } from "../modals/rideModel";
import { NextFunction, Request, Response } from "express";
import { RatingReview } from "../modals/ratingReviewModel";
import { getPipeline, paginationResult } from "../utils/helper";

// Create a new Rating & Review
export const createRatingReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { rideId, rating, review, tags } = req.body;

    if (!rideId || !rating)
      return res
        .status(400)
        .json(new ApiError(400, "rideId and rating are required."));

    const ride = await Ride.findById(rideId).populate("driver");

    if (!ride)
      return res.status(404).json(new ApiError(404, "Ride not found."));

    if (!ride.driver)
      return res
        .status(400)
        .json(new ApiError(400, "No driver assigned to this ride."));

    if (ride.status !== RideStatus.COMPLETED)
      return res
        .status(400)
        .json(new ApiError(400, "Cannot review an incomplete ride."));

    const existingReview = await RatingReview.findOne({ rideId });
    if (existingReview)
      return res
        .status(409)
        .json(new ApiError(409, "Review for this ride already exists."));

    const newReview = new RatingReview({
      tags,
      rideId,
      rating,
      review,
      driver: ride.driver._id,
    });

    await newReview.save();

    return res.status(201).json({
      message: "Rating and review submitted successfully.",
      data: newReview,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
};

// Get all reviews
export const getAllRatingReviews = async (
  _req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10 }: any = _req.query;
    const { pipeline, matchStage, options } = getPipeline(_req.query);

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    pipeline.push(
      {
        $lookup: {
          from: "rides",
          localField: "rideId",
          foreignField: "_id",
          as: "rideInfo",
        },
      },
      {
        $unwind: {
          path: "$rideInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "passengers",
          localField: "rideInfo.user",
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
          rating: 1,
          review: 1,
          createdAt: 1,
          adminAction: 1,
          userID: "$rideInfo.user",
          driverName: "$driverInfo.name",
          userName: "$passengerInfo.name",
          ridePaymentMode: "$rideInfo.status",
          userPhone: "$passengerInfo.phoneNumber",
          driverPhoneNumber: "$driverInfo.phoneNumber",
        },
      }
    );

    const response = await RatingReview.aggregate(pipeline, options);
    const totalReviews = await RatingReview.countDocuments(
      Object.keys(matchStage).length > 0 ? matchStage : {}
    );

    if (!response.length)
      return res.status(404).json(new ApiError(404, "No Reviews found"));

    const data = paginationResult(
      pageNumber,
      limitNumber,
      totalReviews,
      response
    );
    return res
      .status(200)
      .json(new ApiResponse(200, data, "Tickets fetched successfully"));
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error });
  }
};

// Get a review by ID
export const getRatingReviewById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const review: any = await RatingReview.findById(id)
      .populate("rideId")
      .populate("driver");
    if (!review) return res.status(404).json({ message: "Review not found" });
    return res.status(200).json({ success: true, data: review });
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error });
  }
};

// Update admin action (warning/suspended/none)
export const updateAdminAction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { adminAction, adminNotes } = req.body;

    const validActions = ["none", "warning", "suspended"];
    if (!validActions.includes(adminAction)) {
      return res.status(400).json({ message: "Invalid admin action" });
    }

    const review = await RatingReview.findByIdAndUpdate(
      id,
      { adminAction, adminNotes },
      { new: true }
    );

    if (!review) return res.status(404).json({ message: "Review not found" });
    return res.status(200).json({
      data: review,
      success: true,
      message: "Admin action updated successfully.",
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error });
  }
};
