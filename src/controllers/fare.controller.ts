import ApiError from "../utils/ApiError";
import { Request, Response } from "express";
import ApiResponse from "../utils/ApiResponse";
import FareModel, { IFareModel } from "../modals/fareModel";
import { calculateFare, getPipeline, paginationResult } from "../utils/helper";

// Utility for error handling
const handleError = (res: Response, message: string, status = 400) => {
  return res.status(status).json({ success: false, message });
};

/**
 * 📌 Create Fare Slab
 */
export const createFare = async (req: Request, res: Response): Promise<any> => {
  try {
    const { baseFare, perKmRate, distanceTo, vehicleType, distanceFrom } =
      req.body;

    if (distanceFrom >= distanceTo) {
      return handleError(res, "'distanceFrom' must be less than 'distanceTo'");
    }

    const existing = await FareModel.findOne({
      distanceTo,
      vehicleType,
      distanceFrom,
    });

    if (existing) return handleError(res, "Fare slab already exists");

    const fare = new FareModel({
      baseFare,
      perKmRate,
      distanceTo,
      vehicleType,
      distanceFrom,
    });

    await fare.save();
    res.status(201).json({ success: true, data: fare });
  } catch (err: any) {
    handleError(res, err.message || "Failed to create fare", 500);
  }
};

/**
 * 📌 Get All Fares
 */
export const getAllFares = async (
  _req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10 }: any = _req.query;
    const { pipeline, matchStage, options } = getPipeline(_req.query);

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const response = await FareModel.aggregate(pipeline, options);
    const totalFares = await FareModel.countDocuments(
      Object.keys(matchStage).length > 0 ? matchStage : {}
    );

    const data = paginationResult(
      pageNumber,
      limitNumber,
      totalFares,
      response
    );
    return res
      .status(200)
      .json(new ApiResponse(200, data, "Fares fetched successfully"));
  } catch (err: any) {
    handleError(res, err.message || "Failed to get fares", 500);
  }
};

/**
 * 📌 Get Fare by ID
 */
export const getFareById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const fare = await FareModel.findById(req.params.id);
    if (!fare) return handleError(res, "Fare not found", 404);
    res.json({ success: true, data: fare });
  } catch (err: any) {
    handleError(res, err.message || "Failed to get fare", 500);
  }
};

/**
 * 📌 Update Fare by ID
 */
export const updateFareById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const updated = await FareModel.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        isActive: req.body.isActive === "active" || req.body.isActive === true,
      },
      { new: true, runValidators: true }
    );

    if (!updated) return handleError(res, "Fare not found", 404);
    res.json({
      success: true,
      message: "Fare Updated Successfully!",
    });
  } catch (err: any) {
    handleError(res, err.message || "Failed to update fare", 500);
  }
};

/**
 * 📌 Delete Fare by ID
 */
export const deleteFareById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const deleted = await FareModel.findByIdAndDelete(req.params.id);
    if (!deleted) return handleError(res, "Fare not found", 404);
    res.json({ success: true, message: "Fare deleted successfully" });
  } catch (err: any) {
    handleError(res, err.message || "Failed to delete fare", 500);
  }
};

/**
 * 📌 Get Fare by Distance (Public Fare Calculator)
 */
export const getFareByDistance = async (
  vehicleType: any,
  distance: number
): Promise<any> => {
  try {
    if (isNaN(distance) || distance <= 0) return calculateFare(0, vehicleType);

    const fare = await FareModel.findOne({
      vehicleType,
      isActive: true,
      distanceFrom: { $lte: distance },
      distanceTo: { $gte: distance },
    });

    if (!fare) return calculateFare(distance, vehicleType);
    const totalFare = fare.baseFare + distance * fare.perKmRate;
    return totalFare;
  } catch (err: any) {
    return calculateFare(distance, vehicleType);
  }
};
