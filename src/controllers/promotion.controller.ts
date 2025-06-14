import mongoose from "mongoose";
import ApiError from "../utils/ApiError";
import { Promotion } from "../modals/promotionModel";
import { Ride, RideStatus } from "../modals/rideModel";
import { Request, Response, NextFunction } from "express";
import { getPipeline, paginationResult } from "../utils/helper";

// Create a new promotion
export const createPromotion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const {
      code,
      type,
      value,
      target,
      validTo,
      validFrom,
      description,
      minRideAmount,
      globalUsageLimit,
      usageLimitPerUser,
      maxDiscountAmount,
    } = req.body;

    if (
      !code ||
      !type ||
      !value ||
      !target ||
      !validTo ||
      !validFrom ||
      !usageLimitPerUser
    ) {
      return next(
        new ApiError(400, "Missing required fields in promotion data.")
      );
    }

    const promo = new Promotion({
      code,
      type,
      target,
      validTo,
      validFrom,
      description,
      value: Number(value),
      minRideAmount: Number(minRideAmount),
      globalUsageLimit: Number(globalUsageLimit),
      usageLimitPerUser: Number(usageLimitPerUser),
      maxDiscountAmount: Number(maxDiscountAmount),
    });

    await promo.save();

    return res.status(201).json({
      message: "🎉 Promotion created successfully",
      data: promo,
      success: true,
    });
  } catch (err) {
    return next(new ApiError(500, "Failed to create promotion", err));
  }
};

// Get all promotions
export const getAllPromotions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { page = 1, limit = 10 }: any = req.query;
    const { pipeline, matchStage, options } = getPipeline(req.query);

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    pipeline.push({
      $project: {
        _id: 1,
        code: 1,
        type: 1,
        value: 1,
        target: 1,
        validTo: 1,
        isActive: 1,
        validFrom: 1,
        usageLimitPerUser: 1,
        globalUsageLimit: 1,
      },
    });

    const promotion = await Promotion.aggregate(pipeline, options);
    const totalrides = await Promotion.countDocuments(
      Object.keys(matchStage).length > 0 ? matchStage : {}
    );

    const response = paginationResult(
      pageNumber,
      limitNumber,
      totalrides,
      promotion
    );
    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    return next(new ApiError(500, "Failed to fetch promotions", err));
  }
};

// Get active promotions only
export const getActivePromotions = async (
  _: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const activePromos = await Promotion.find({ isActive: true });
    return res.status(200).json({ success: true, data: activePromos });
  } catch (err) {
    return next(new ApiError(500, "Failed to fetch active promotions", err));
  }
};

/**
 * @desc Get promotion by ID
 * @route GET /api/promotions/:id
 * @access Admin
 */
export const getPromotionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    if (!id) return next(new ApiError(400, "Invalid promotion ID format"));

    const promotion = await Promotion.findById(id);
    if (!promotion) return next(new ApiError(404, "Promotion not found"));

    return res.status(200).json({
      success: true,
      data: promotion,
      message: "Promotion fetched successfully",
    });
  } catch (error) {
    return next(new ApiError(500, "Failed to fetch promotion", error));
  }
};

// Update a promotion
export const updatePromotion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const updated = await Promotion.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        isActive: req.body.isActive === "active" || req.body.isActive === true,
      },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updated) return next(new ApiError(404, "Promotion not found"));
    return res.status(200).json({
      data: updated,
      success: true,
      message: "Promotion updated successfully",
    });
  } catch (err) {
    return next(new ApiError(500, "Failed to update promotion", err));
  }
};

// Delete a promotion
export const deletePromotion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const deleted = await Promotion.findByIdAndDelete(req.params.id);
    if (!deleted) return next(new ApiError(404, "Promotion not found"));
    return res
      .status(200)
      .json({ success: true, message: "Promotion deleted successfully" });
  } catch (err) {
    return next(new ApiError(500, "Failed to delete promotion", err));
  }
};

// Toggle promotion isActive status
export const togglePromotionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return next(new ApiError(404, "Promotion not found"));

    promo.isActive = !promo.isActive;
    await promo.save();

    return res.status(200).json({
      message: `Promotion ${promo.isActive ? "enabled" : "disabled"}`,
      data: promo,
      success: true,
    });
  } catch (err) {
    return next(new ApiError(500, "Failed to toggle promotion", err));
  }
};

// Apply a promo code (validation logic)
export const applyPromotion = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id: userId } = req.user;
    const { code, rideId } = req.body;

    if (!code || !rideId)
      return next(new ApiError(400, "Promo code and ride ID are required"));

    const ride: any = await Ride.findOne({
      _id: rideId,
      status: RideStatus.ACCEPTED,
    });

    if (!ride) return next(new ApiError(400, "Ride not found or not eligible"));
    if (ride?.promoCode)
      return next(new ApiError(400, "ALready applied promo code"));

    const amount = Number(ride.fare || 0);
    const promo: any = await Promotion.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!promo) return next(new ApiError(404, "Invalid or expired promo code"));
    const now = new Date();

    if (promo.validFrom > now || promo.validTo < now)
      return next(new ApiError(400, "Promo code not valid at this time"));

    if (promo.minRideAmount && amount < promo.minRideAmount)
      return next(
        new ApiError(400, `Minimum ride amount must be ₹${promo.minRideAmount}`)
      );

    if (!promo.usedBy) promo.usedBy = [];

    const userUsageCount =
      (promo.usedBy &&
        promo.usedBy.filter((id: any) =>
          new mongoose.Types.ObjectId(id).equals(userId)
        ).length) ??
      0;

    if (userUsageCount && userUsageCount >= promo.usageLimitPerUser) {
      return next(
        new ApiError(400, "Promo code usage limit reached for this user")
      );
    }

    if (
      promo.usedBy &&
      promo.globalUsageLimit &&
      promo.usedBy.length >= promo.globalUsageLimit
    ) {
      return next(new ApiError(400, "Global promo code usage limit exceeded"));
    }

    // Calculate discount
    let discount =
      promo.type === "flat" ? promo.value : (amount * promo.value) / 100;

    if (promo.maxDiscountAmount && discount > promo.maxDiscountAmount) {
      discount = promo.maxDiscountAmount;
    }

    // ✅ Save promo usage now
    promo.usedBy.push(new mongoose.Types.ObjectId(userId));
    await promo.save();

    ride.fare = amount - discount;
    ride.promoCode = promo._id;
    ride.promoCodeDetails = {
      code: promo.code,
      type: promo.type,
      discount: discount,
      value: promo.value,
      minRideAmount: promo.minRideAmount,
      maxDiscountAmount: promo.maxDiscountAmount,
    };
    await ride.save();

    return res.status(200).json({
      message: "Promo code applied successfully",
      discount,
      success: true,
      finalFare: amount - discount,
      promoId: promo._id,
      promoDetails: {
        code: promo.code,
        type: promo.type,
        value: promo.value,
        minRideAmount: promo.minRideAmount,
        maxDiscountAmount: promo.maxDiscountAmount,
      },
    });
  } catch (err) {
    return next(new ApiError(500, "Failed to apply promo code", err));
  }
};

export const removePromotion = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { code, rideId } = req.body;
    const { id: userId } = req.user;

    const ride = await Ride.findOne({
      _id: rideId,
      status: RideStatus.ACCEPTED,
    });

    if (!ride) return next(new ApiError(400, "Ride not found or not eligible"));

    if (!code || typeof code !== "string")
      return next(new ApiError(400, "Invalid or missing promo code"));

    const promo = await Promotion.findOne({ code: code.toUpperCase() });
    if (!promo) return next(new ApiError(404, "Promo code not found"));

    const usedIndex = promo?.usedBy.findIndex((id) =>
      new mongoose.Types.ObjectId(id).equals(userId)
    );

    if (usedIndex === -1)
      return next(
        new ApiError(400, "Promo was not applied or already removed")
      );

    promo.usedBy.splice(usedIndex, 1);
    await promo.save();

    ride.fare = ride.fare + ride.promoCodeDetails.discount;
    ride.promoCode = null;
    ride.promoCodeDetails = null;
    await ride.save();

    return res.status(200).json({
      success: true,
      code: promo.code,
      message: "Promo code usage removed successfully",
    });
  } catch (err) {
    return next(new ApiError(500, "Failed to remove promo code", err));
  }
};
