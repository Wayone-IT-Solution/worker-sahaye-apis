import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { extractImageUrl } from "../community/community.controller";
import { PersonalAssistant } from "../../modals/personalassistant.model";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { PlanType } from "../../modals/subscriptionplan.model";
import { Booking } from "../../modals/booking.model";

const PersonalAssistantService = new CommonService(PersonalAssistant);

export class PersonalAssistantController {
  static async createPersonalAssistant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const duplicate = await PersonalAssistant.findOne({
        $or: [
          { email: req.body.email },
          { phoneNumber: req.body.phoneNumber },
          { name: req.body.name },
        ],
      });
      const profileImageUrl = req?.body?.profileImageUrl[0]?.url;
      if (!profileImageUrl)
        return res
          .status(403)
          .json(new ApiError(403, "Profile Image is Required."));
      if (duplicate) {
        return res
          .status(409)
          .json(
            new ApiError(
              409,
              "Personal Assistant with same name, email, or phoneNumber already exists."
            )
          );
      }
      const location = {
        city: req.body.city,
        state: req.body.state,
        pinCode: req.body.pinCode,
        country: req.body.country,
      };
      const result = await PersonalAssistantService.create({
        ...req.body,
        location,
        profileImageUrl,
      });
      if (!result) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Failed to create Personal Assistant profile")
          );
      }

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            "Personal Assistant created successfully"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllPersonalAssistants(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PersonalAssistantService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPersonalAssistantById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PersonalAssistantService.getById(
        req.params.id,
        false
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Personal Assistant not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updatePersonalAssistantById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const location = {
        city: req.body.city,
        state: req.body.state,
        pinCode: req.body.pinCode,
        country: req.body.country,
      };
      const profileImageUrl = req?.body?.profileImageUrl[0]?.url;
      const record = await PersonalAssistantService.getById(id);
      if (!record) {
        return res.status(404).json(new ApiError(404, "Assistant not found."));
      }

      let imageUrl;
      if (req?.body?.image && record.profileImageUrl)
        imageUrl = await extractImageUrl(
          req?.body?.image,
          record.profileImageUrl as string
        );

      const result = await PersonalAssistantService.updateById(id, {
        ...req.body,
        location,
        profileImageUrl: imageUrl || profileImageUrl,
      });
      if (!result) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Failed to update Personal Assistant profile.")
          );
      }
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Personal Assistant profile updated successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async deletePersonalAssistantById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await PersonalAssistantService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Personal Assistant profile not found."));
      }
      const result = await PersonalAssistantService.deleteById(id);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Personal Assistant profile deleted successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getPersonalAssistanceBenefits(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req as any).user?.id || null;

      // Default benefits for FREE plan (no subscription)
      const defaultBenefits = {
        planType: PlanType.FREE,
        charges: "100% MRP",
        discountPercentage: 0,
        priority: "No priority",
        freeServicesPerYear: 0,
        canAccess: true,
      };

      if (!userId) {
        return res.status(200).json(
          new ApiResponse(
            200,
            defaultBenefits,
            "Personal Assistance benefits for FREE plan"
          )
        );
      }

      // Get user's active subscription plan
      const enrolledPlan = await EnrolledPlan.findOne({
        user: userId,
        status: "active",
      }).populate("plan");

      // If no active plan, return FREE plan benefits
      if (!enrolledPlan) {
        return res.status(200).json(
          new ApiResponse(
            200,
            defaultBenefits,
            "Personal Assistance benefits for FREE plan"
          )
        );
      }

      const planType = (enrolledPlan.plan as any).planType;

      // Define personal assistance benefits based on plan type
      const benefitsMap: Record<
        string,
        {
          planType: string;
          charges: string;
          discountPercentage: number;
          priority: string;
          freeServicesPerYear: number;
          canAccess: boolean;
        }
      > = {
        [PlanType.FREE]: {
          planType: PlanType.FREE,
          charges: "100% MRP",
          discountPercentage: 0,
          priority: "No priority",
          freeServicesPerYear: 0,
          canAccess: true,
        },
        [PlanType.BASIC]: {
          planType: PlanType.BASIC,
          charges: "10% Discount on MRP",
          discountPercentage: 10,
          priority: "Normal Priority",
          freeServicesPerYear: 0,
          canAccess: true,
        },
        [PlanType.PREMIUM]: {
          planType: PlanType.PREMIUM,
          charges: "30% Discount on MRP",
          discountPercentage: 30,
          priority: "Highest Priority",
          freeServicesPerYear: 1,
          canAccess: true,
        },
      };

      const benefits = benefitsMap[planType] ?? defaultBenefits;

      return res.status(200).json(
        new ApiResponse(
          200,
          benefits,
          `Personal Assistance benefits for ${planType} plan`
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async bookPersonalAssistance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req as any).user?.id;
      const {
        assistantId,
        supportServiceId,
        serviceLocationId,
        userLocation,
        notes,
        basePrice,
        timeslotId,
      } = req.body;

      // Validation
      if (!basePrice || basePrice <= 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Valid base price is required"));
      }

      if (!assistantId || !supportServiceId) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Assistant ID and Support Service ID are required"
            )
          );
      }

      // Get user's active subscription plan
      const enrolledPlan = await EnrolledPlan.findOne({
        user: userId,
        status: "active",
      }).populate("plan");

      // Determine pricing and benefits based on plan
      let discountPercentage = 0;
      let isFreeService = false;
      let planType = PlanType.FREE;

      if (enrolledPlan) {
        planType = (enrolledPlan.plan as any).planType;

        // Define discount and benefits based on plan type
        const pricingMap: Record<
          string,
          { discount: number; isFree: boolean }
        > = {
          [PlanType.FREE]: { discount: 0, isFree: false },
          [PlanType.BASIC]: { discount: 10, isFree: false },
          [PlanType.PREMIUM]: { discount: 30, isFree: true },
        };

        const pricing = pricingMap[planType];
        discountPercentage = pricing.discount;

        // Check if PREMIUM user has free service available (1 per year)
        if (planType === PlanType.PREMIUM && pricing.isFree) {
          const currentYear = new Date().getFullYear();
          const currentYearStart = new Date(currentYear, 0, 1);

          // Check if user has already used their free service this year
          const freeServiceUsed = await Booking.findOne({
            user: userId,
            status: { $ne: "cancelled" },
            createdAt: { $gte: currentYearStart },
            metaDetails: { isFreeService: true },
          });

          if (!freeServiceUsed) {
            isFreeService = true;
          }
        }
      }

      // Calculate final amount
      let finalAmount = basePrice;
      if (isFreeService) {
        finalAmount = 0;
      } else {
        const discount = (basePrice * discountPercentage) / 100;
        finalAmount = basePrice - discount;
      }

      // Create booking
      const booking = await Booking.create({
        user: userId,
        assistant: assistantId,
        supportService: supportServiceId,
        serviceLocationId,
        userLocation,
        notes,
        totalAmount: finalAmount,
        timeslotId,
        metaDetails: {
          basePrice,
          discountPercentage,
          isFreeService,
          planType,
          originalAmount: basePrice,
        },
        status: "pending",
        paymentStatus: isFreeService ? "success" : "pending",
        canCall: true,
      });

      return res.status(201).json(
        new ApiResponse(
          201,
          {
            booking: booking,
            pricing: {
              basePrice,
              discountPercentage,
              isFreeService,
              finalAmount,
              planType,
              message: isFreeService
                ? "This service is FREE under your PREMIUM plan (1 per year)"
                : `You get ${discountPercentage}% discount on this service with your ${planType} plan`,
            },
          },
          "Personal Assistance booked successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }
}

