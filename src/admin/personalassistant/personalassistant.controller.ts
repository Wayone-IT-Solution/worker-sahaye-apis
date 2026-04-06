import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { extractImageUrl } from "../community/community.controller";
import { PersonalAssistant } from "../../modals/personalassistant.model";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { PlanType } from "../../modals/subscriptionplan.model";
import { Booking } from "../../modals/booking.model";
import { Slot } from "../../modals/slot.model";
import SupportService from "../../modals/supportservice.model";

const PersonalAssistantService = new CommonService(PersonalAssistant);

export class PersonalAssistantController {
  static async createPersonalAssistant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const profileImageUrl = req?.body?.profileImageUrl[0]?.url;
      const location = {
        city: req.body.city,
        state: req.body.state,
        pinCode: req.body.pinCode,
        country: req.body.country,
      };
      const paInformation = {
        fullName: req.body.paFullName,
        email: req.body.paEmail,
        phoneNumber: req.body.paPhoneNumber,
        address: req.body.paAddress,
      };
      const result = await PersonalAssistantService.create({
        ...req.body,
        location,
        profileImageUrl,
        paInformation,
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
      const paInformation = {
        fullName: req.body.paFullName,
        email: req.body.paEmail,
        phoneNumber: req.body.paPhoneNumber,
        address: req.body.paAddress,
      };
      const profileImageUrl = req?.body?.profileImageUrl && Array.isArray(req.body.profileImageUrl) && req.body.profileImageUrl[0]?.url;
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
        paInformation,
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

  // Dashboard Analytics Methods
  static async getDashboardOverview(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const [totalAssistants, totalSlots, totalBookings, totalRevenue, todayBookings] = await Promise.all([
        PersonalAssistant.countDocuments(),
        Slot.aggregate([{ $group: { _id: null, count: { $sum: { $size: "$timeslots" } } } }]),
        Booking.countDocuments(),
        Booking.aggregate([
          { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
        ]),
        Booking.countDocuments({
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        }),
      ]);

      const overview = {
        totalAssistants,
        totalSlots: totalSlots[0]?.count || 0,
        totalBookings,
        totalRevenue: totalRevenue[0]?.totalRevenue || 0,
        todayBookings,
      };

      return res.status(200).json(
        new ApiResponse(200, overview, "Dashboard overview fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAssistantsWithSlots(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Extract filter parameters from query
      const { search, status, verified, city, startDate, endDate, sortBy = "totalBookings" } = req.query;
      
      // Build match stage for filtering
      const matchStage: any = {};
      
      // Search by name, email, paKey
      if (search) {
        matchStage.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { paKey: { $regex: search, $options: "i" } },
        ];
      }
      
      // Filter by status
      if (status !== undefined) {
        matchStage.isActive = status === "active" ? true : false;
      }
      
      // Filter by verified
      if (verified !== undefined) {
        matchStage.verified = verified === "true" ? true : false;
      }
      
      // Filter by city
      if (city) {
        matchStage["location.city"] = { $in: [city] };
      }
      
      // Filter by date range
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) {
          matchStage.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          const endDateObj = new Date(endDate as string);
          endDateObj.setHours(23, 59, 59, 999);
          matchStage.createdAt.$lte = endDateObj;
        }
      }
      
      // Build sort stage
      const sortStage: any = {};
      switch(sortBy) {
        case "name":
          sortStage.name = 1;
          break;
        case "revenue":
          sortStage.totalRevenue = -1;
          break;
        case "slots":
          sortStage.totalSlots = -1;
          break;
        case "newest":
          sortStage.createdAt = -1;
          break;
        case "oldest":
          sortStage.createdAt = 1;
          break;
        default:
          sortStage.totalBookings = -1;
      }
      
      const assistants = await PersonalAssistant.aggregate([
        {
          $lookup: {
            from: "slots",
            localField: "_id",
            foreignField: "user",
            as: "slotInfo",
          },
        },
        {
          $addFields: {
            totalSlots: {
              $sum: { $map: { input: "$slotInfo", as: "slot", in: { $size: "$$slot.timeslots" } } },
            },
            bookedSlots: {
              $sum: {
                $map: {
                  input: "$slotInfo",
                  as: "slot",
                  in: {
                    $size: {
                      $filter: { input: "$$slot.timeslots", as: "ts", cond: "$$ts.isBooked" },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "bookings",
            localField: "_id",
            foreignField: "assistant",
            as: "bookings",
          },
        },
        {
          $addFields: {
            totalBookings: { $size: "$bookings" },
            totalRevenue: { $sum: "$bookings.totalAmount" },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            phoneNumber: 1,
            profileImageUrl: 1,
            paKey: 1,
            paInformation: 1,
            location: 1,
            isActive: 1,
            verified: 1,
            createdAt: 1,
            totalSlots: 1,
            bookedSlots: 1,
            availableSlots: { $subtract: ["$totalSlots", "$bookedSlots"] },
            totalBookings: 1,
            totalRevenue: 1,
          },
        },
        // Apply filters if any exist
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        { $sort: sortStage },
      ]);

      return res.status(200).json(
        new ApiResponse(200, assistants, "Assistants with slots fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getTodaySlots(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaySlots = await Slot.aggregate([
        {
          $lookup: {
            from: "personalassistants",
            localField: "user",
            foreignField: "_id",
            as: "assistant",
          },
        },
        { $unwind: "$assistant" },
        {
          $project: {
            assistant: "$assistant",
            timeslots: {
              $filter: {
                input: "$timeslots",
                as: "slot",
                cond: {
                  $and: [
                    { $gte: ["$$slot.date", today] },
                    { $lt: ["$$slot.date", tomorrow] },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            totalSlots: { $size: "$timeslots" },
            bookedSlots: {
              $size: { $filter: { input: "$timeslots", as: "ts", cond: "$$ts.isBooked" } },
            },
          },
        },
      ]);

      return res.status(200).json(
        new ApiResponse(200, todaySlots, "Today's slots fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getSlotsByDateRange(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json(
          new ApiError(400, "Start date and end date are required")
        );
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const slotsByRange = await Slot.aggregate([
        {
          $lookup: {
            from: "personalassistants",
            localField: "user",
            foreignField: "_id",
            as: "assistant",
          },
        },
        { $unwind: "$assistant" },
        {
          $project: {
            assistant: "$assistant",
            timeslots: {
              $filter: {
                input: "$timeslots",
                as: "slot",
                cond: {
                  $and: [
                    { $gte: ["$$slot.date", start] },
                    { $lte: ["$$slot.date", end] },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            totalSlots: { $size: "$timeslots" },
            bookedSlots: {
              $size: { $filter: { input: "$timeslots", as: "ts", cond: "$$ts.isBooked" } },
            },
          },
        },
      ]);

      return res.status(200).json(
        new ApiResponse(200, slotsByRange, "Slots by date range fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async get7DaysSlots(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

      const sevenDaysData = await Slot.aggregate([
        {
          $lookup: {
            from: "personalassistants",
            localField: "user",
            foreignField: "_id",
            as: "assistant",
          },
        },
        { $unwind: "$assistant" },
        {
          $project: {
            assistant: "$assistant",
            timeslots: {
              $filter: {
                input: "$timeslots",
                as: "slot",
                cond: {
                  $and: [
                    { $gte: ["$$slot.date", today] },
                    { $lt: ["$$slot.date", sevenDaysLater] },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            totalSlots: { $size: "$timeslots" },
            bookedSlots: {
              $size: { $filter: { input: "$timeslots", as: "ts", cond: "$$ts.isBooked" } },
            },
          },
        },
      ]);

      return res.status(200).json(
        new ApiResponse(200, sevenDaysData, "7 days slots fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async get30DaysSlots(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      const thirtyDaysData = await Slot.aggregate([
        {
          $lookup: {
            from: "personalassistants",
            localField: "user",
            foreignField: "_id",
            as: "assistant",
          },
        },
        { $unwind: "$assistant" },
        {
          $project: {
            assistant: "$assistant",
            timeslots: {
              $filter: {
                input: "$timeslots",
                as: "slot",
                cond: {
                  $and: [
                    { $gte: ["$$slot.date", today] },
                    { $lt: ["$$slot.date", thirtyDaysLater] },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            totalSlots: { $size: "$timeslots" },
            bookedSlots: {
              $size: { $filter: { input: "$timeslots", as: "ts", cond: "$$ts.isBooked" } },
            },
          },
        },
      ]);

      return res.status(200).json(
        new ApiResponse(200, thirtyDaysData, "30 days slots fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getTopSupportServices(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const topServices = await Booking.aggregate([
        {
          $group: {
            _id: "$supportService",
            totalBookings: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { totalBookings: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "supportservices",
            localField: "_id",
            foreignField: "_id",
            as: "service",
          },
        },
        { $unwind: "$service" },
        {
          $project: {
            _id: 1,
            serviceName: "$service.serviceName",
            totalBookings: 1,
            totalRevenue: 1,
          },
        },
      ]);

      return res.status(200).json(
        new ApiResponse(200, topServices, "Top support services fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getBookingStats(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const stats = await Booking.aggregate([
        {
          $facet: {
            byStatus: [
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ],
            byPaymentStatus: [
              { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
            ],
            dailyBookings: [
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  count: { $sum: 1 },
                  revenue: { $sum: "$totalAmount" },
                },
              },
              { $sort: { _id: -1 } },
              { $limit: 30 },
            ],
          },
        },
      ]);

      return res.status(200).json(
        new ApiResponse(200, stats[0], "Booking stats fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }
}


