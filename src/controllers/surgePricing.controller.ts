import ApiError from "../utils/ApiError";
import { Request, Response, NextFunction } from "express";
import { SurgePricing } from "../modals/surgePricing.model";
import { getPipeline, paginationResult } from "../utils/helper";

// Create a surge pricing rule
export const createSurgePricing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const {
      days,
      title,
      endTime,
      isActive,
      startTime,
      multiplier,
      distanceTo,
      distanceFrom,
    } = req.body;

    if (!title || !startTime || !endTime || !days || !multiplier)
      return next(new ApiError(400, "Missing required fields"));

    const surge = new SurgePricing({
      days,
      title,
      endTime,
      startTime,
      multiplier: Number(multiplier),
      distanceTo: Number(distanceTo),
      isActive: isActive === "active",
      distanceFrom: Number(distanceFrom),
    });

    await surge.save();

    return res.status(201).json({
      data: surge,
      success: true,
      message: "Surge pricing rule created successfully",
    });
  } catch (err) {
    return next(new ApiError(500, "Failed to create surge pricing", err));
  }
};

// Get all surge pricing rules
export const getAllSurgePricings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { page = 1, limit = 10 }: any = req.query;
    const { pipeline, matchStage, options } = getPipeline(req.query);

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const surges = await SurgePricing.aggregate(pipeline, options);
    const totalsurges = await SurgePricing.countDocuments(
      Object.keys(matchStage).length > 0 ? matchStage : {}
    );

    const response = paginationResult(
      pageNumber,
      limitNumber,
      totalsurges,
      surges
    );
    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    return next(new ApiError(500, "Failed to fetch surge pricing rules", err));
  }
};

// Get a specific surge pricing rule by ID
export const getSurgePricingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const surge = await SurgePricing.findById(req.params.id);
    if (!surge) return next(new ApiError(404, "Surge pricing not found"));

    return res.status(200).json({ data: surge, success: true });
  } catch (err) {
    return next(new ApiError(500, "Failed to get surge pricing rule", err));
  }
};

// Update a surge pricing rule
export const updateSurgePricing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const updated = await SurgePricing.findByIdAndUpdate(
      req.params.id,
      { ...req.body, isActive: req.body.isActive === "active" ? true : false },
      { new: true, runValidators: true }
    );
    if (!updated) return next(new ApiError(404, "Surge pricing not found"));

    return res.status(200).json({
      data: updated,
      success: true,
      message: "Surge pricing rule updated",
    });
  } catch (err) {
    return next(new ApiError(500, "Failed to update surge pricing", err));
  }
};

// Toggle isActive field (activate/deactivate)
export const toggleSurgePricingActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const surge = await SurgePricing.findById(req.params.id);
    if (!surge) return next(new ApiError(404, "Surge pricing not found"));

    surge.isActive = !surge.isActive;
    await surge.save();

    return res.status(200).json({
      data: surge,
      success: true,
      message: `Surge pricing ${surge.isActive ? "activated" : "deactivated"}`,
    });
  } catch (err) {
    return next(new ApiError(500, "Failed to toggle surge pricing", err));
  }
};

// Delete a surge pricing rule
export const deleteSurgePricing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const deleted = await SurgePricing.findByIdAndDelete(req.params.id);
    if (!deleted) return next(new ApiError(404, "Surge pricing not found"));

    return res
      .status(200)
      .json({ message: "Surge pricing rule deleted", data: deleted });
  } catch (err) {
    return next(new ApiError(500, "Failed to delete surge pricing", err));
  }
};
