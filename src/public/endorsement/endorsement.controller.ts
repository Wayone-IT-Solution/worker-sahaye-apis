import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import FileUpload from "../../modals/fileupload.model";
import { NextFunction, Request, Response } from "express";
import { Endorsement } from "../../modals/endorsement.model";
import { CommonService } from "../../services/common.services";
import { ConnectionModel, ConnectionStatus } from "../../modals/connection.model";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { PlanType } from "../../modals/subscriptionplan.model";
import { User } from "../../modals/user.model";

const endorsementService = new CommonService(Endorsement);

// Helper function to check endorsement eligibility based on subscription plan
const getEndorsementEligibility = async (userId: string) => {
  // Get user's active subscription plan
  const enrolledPlan = await EnrolledPlan.findOne({
    user: userId,
    status: "active",
  }).populate("plan");

  // If no active plan, user is on FREE plan - not eligible for endorsement requests
  if (!enrolledPlan) {
    return {
      eligible: false,
      planType: PlanType.FREE,
      message: "Endorsement requests are available for BASIC and PREMIUM plan members. Please upgrade your subscription to request endorsements.",
    };
  }

  const planType = (enrolledPlan.plan as any).planType;

  // BASIC and PREMIUM plans are eligible, FREE plan is not
  if (planType === PlanType.FREE) {
    return {
      eligible: false,
      planType: PlanType.FREE,
      message: "Endorsement requests are available for BASIC and PREMIUM plan members. Please upgrade your subscription to request endorsements.",
    };
  }

  return {
    eligible: true,
    planType: planType,
    message: "You are eligible to request endorsements.",
  };
};

export class EndorsementController {
  static async createEndorsement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = (req as any).user; // user making the request (Person A)
      const { endorsedBy } = req.body; // Person B (expected to endorse)

      if (!endorsedBy) {
        return res.status(400).json(new ApiError(400, "Missing endorsedBy field"));
      }

      // Check if user is a WORKER
      const userDoc = await User.findById(userId).select("userType").lean();
      if (!userDoc) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }

      if (userDoc.userType !== "worker") {
        return res.status(403).json(new ApiError(403, "Only workers can create endorsements"));
      }

      // Check endorsement eligibility based on subscription plan
      const endorsementEligibility = await getEndorsementEligibility(userId);
      if (!endorsementEligibility.eligible) {
        return res.status(403).json(
          new ApiError(403, endorsementEligibility.message)
        );
      }

      // ✅ Ensure A & B have accepted connection
      const connection = await ConnectionModel.findOne({
        $or: [
          {
            requester: userId,
            recipient: endorsedBy,
            status: ConnectionStatus.ACCEPTED,
          },
          {
            requester: endorsedBy,
            recipient: userId,
            status: ConnectionStatus.ACCEPTED,
          },
        ],
      });

      if (!connection) {
        return res
          .status(403)
          .json(new ApiError(403, "You must have an accepted connection to request an endorsement"));
      }

      // ✅ Prevent duplicate request
      const alreadyExists = await Endorsement.findOne({
        endorsedBy,
        endorsedTo: userId,
        isRequest: true,
        status: "pending",
      });

      if (alreadyExists) {
        return res
          .status(200)
          .json(new ApiResponse(200, alreadyExists, "Endorsement request already sent!"));
      }

      // ✅ Create endorsement request (not actual endorsement yet)
      const data = {
        endorsedBy,
        isRequest: true,
        status: "pending",
        endorsedTo: userId,
        connectionId: connection._id,
      };

      const result = await endorsementService.create((data as any));
      if (!result) {
        return res.status(400).json(new ApiError(400, "Failed to create endorsement request"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Endorsement request created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllEndorsements(req: Request, res: Response, next: NextFunction) {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "endorsedBy",
            foreignField: "_id",
            as: "endorsedByDetails",
          },
        },
        { $unwind: "$endorsedByDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$endorsedBy" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$refId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] }
                    ]
                  }
                }
              },
              { $limit: 1 }
            ],
            as: "endorsedByProfile",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "endorsedTo",
            foreignField: "_id",
            as: "endorsedToDetails",
          },
        },
        { $unwind: "$endorsedToDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$endorsedTo" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$refId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] }
                    ]
                  }
                }
              },
              { $limit: 1 }
            ],
            as: "endorsedToProfile",
          },
        },
        {
          $project: {
            _id: 1,
            message: 1,
            respect: 1,
            timelines: 1,
            fulfilled: 1,
            createdAt: 1,
            updatedAt: 1,
            endorsedBy: 1,
            endorsedTo: 1,
            wouldRehire: 1,
            qualityOfWork: 1,
            overallPerformance: 1,
            "endorsedByDetails.email": 1,
            "endorsedByDetails.mobile": 1,
            "endorsedByDetails.fullName": 1,
            "endorsedByDetails.userType": 1,
            "endorsedByProfile": { $arrayElemAt: ["$endorsedByProfile.url", 0] },
            "endorsedToDetails.email": 1,
            "endorsedToDetails.mobile": 1,
            "endorsedToDetails.fullName": 1,
            "endorsedToDetails.userType": 1,
            "endorsedToProfile": { $arrayElemAt: ["$endorsedToProfile.url", 0] },
          },
        },
      ];

      const result = await endorsementService.getAll(req.query, pipeline);
      return res.status(200).json(
        new ApiResponse(200, result, "Endorsements fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async showMyPendingEndorsementRequests(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId } = (req as any).user;

      const pipeline = [
        {
          $match: {
            endorsedTo: new mongoose.Types.ObjectId(userId),
            fulfilled: false,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "endorsedBy",
            foreignField: "_id",
            as: "endorsedByDetails",
          },
        },
        { $unwind: "$endorsedByDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$endorsedBy" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$refId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "endorsedByProfile",
          },
        },
        {
          $project: {
            _id: 1,
            message: 1,
            respect: 1,
            timelines: 1,
            fulfilled: 1,
            createdAt: 1,
            updatedAt: 1,
            endorsedBy: 1,
            endorsedTo: 1,
            wouldRehire: 1,
            qualityOfWork: 1,
            overallPerformance: 1,
            "endorsedByDetails.email": 1,
            "endorsedByDetails.fullName": 1,
            "endorsedByDetails.userType": 1,
            "endorsedByProfile": { $arrayElemAt: ["$endorsedByProfile.url", 0] },
          },
        },
      ];

      const result = await endorsementService.getAll(req.query, pipeline);

      return res.status(200).json(
        new ApiResponse(200, result, "Endorsement requests you sent are listed")
      );
    } catch (err) {
      next(err);
    }
  }

  static async showPendingRequestsICanFulfill(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = (req as any).user;
      const pipeline = [
        {
          $match: {
            endorsedBy: new mongoose.Types.ObjectId(userId),
            fulfilled: false,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "endorsedTo",
            foreignField: "_id",
            as: "endorsedToDetails",
          },
        },
        { $unwind: "$endorsedToDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$endorsedBy" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$refId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "endorsedToProfile",
          },
        },
        {
          $project: {
            _id: 1,
            message: 1,
            respect: 1,
            timelines: 1,
            fulfilled: 1,
            createdAt: 1,
            updatedAt: 1,
            endorsedBy: 1,
            endorsedTo: 1,
            wouldRehire: 1,
            qualityOfWork: 1,
            overallPerformance: 1,
            "endorsedToDetails.email": 1,
            "endorsedToDetails.mobile": 1,
            "endorsedToDetails.fullName": 1,
            "endorsedToDetails.userType": 1,
            "endorsedToProfile": { $arrayElemAt: ["$endorsedToProfile.url", 0] },
          },
        },
      ];
      const result = await endorsementService.getAll(req.query, pipeline);
      return res.status(200).json(
        new ApiResponse(200, result, "Endorsement requests you can fulfill")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAllEndorsementsReceived(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = (req as any).user;
      const pipeline = [
        {
          $match: {
            endorsedTo: new mongoose.Types.ObjectId(userId),
            isRequest: false, // ✅ only real endorsements
            fulfilled: true,  // ✅ only completed
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "endorsedBy",
            foreignField: "_id",
            as: "endorsedByDetails",
          },
        },
        { $unwind: "$endorsedByDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$endorsedBy" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$refId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "endorsedByProfile",
          },
        },
        {
          $project: {
            _id: 1,
            message: 1,
            respect: 1,
            timelines: 1,
            fulfilled: 1,
            createdAt: 1,
            updatedAt: 1,
            endorsedBy: 1,
            endorsedTo: 1,
            wouldRehire: 1,
            qualityOfWork: 1,
            overallPerformance: 1,
            "endorsedByDetails.email": 1,
            "endorsedByDetails.mobile": 1,
            "endorsedByDetails.fullName": 1,
            "endorsedByDetails.userType": 1,
            endorsedByProfile: { $arrayElemAt: ["$endorsedByProfile.url", 0] },
          },
        },
      ];

      const result = await endorsementService.getAll(req.query, pipeline);
      return res.status(200).json(
        new ApiResponse(200, result, "Endorsements received successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAllEndorsementsGiven(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = (req as any).user;
      const pipeline = [
        {
          $match: {
            endorsedBy: new mongoose.Types.ObjectId(userId),
            isRequest: false, // ✅ only real endorsements
            fulfilled: true,  // ✅ only completed
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "endorsedTo",
            foreignField: "_id",
            as: "endorsedToDetails",
          },
        },
        { $unwind: "$endorsedToDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$endorsedTo" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$refId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "endorsedToProfile",
          },
        },
        {
          $project: {
            _id: 1,
            message: 1,
            fulfilled: 1,
            createdAt: 1,
            updatedAt: 1,
            endorsedBy: 1,
            endorsedTo: 1,
            overallPerformance: 1,
            qualityOfWork: 1,
            timelines: 1,
            respect: 1,
            wouldRehire: 1,
            "endorsedToDetails.email": 1,
            "endorsedToDetails.mobile": 1,
            "endorsedToDetails.fullName": 1,
            "endorsedToDetails.userType": 1,
            endorsedToProfile: { $arrayElemAt: ["$endorsedToProfile.url", 0] },
          },
        },
      ];
      const result = await endorsementService.getAll(req.query, pipeline);
      return res.status(200).json(
        new ApiResponse(200, result, "Endorsements given successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getEndorsementById(req: Request, res: Response, next: NextFunction) {
    try {
      const result: any = await Endorsement.findById(req.params.id)
        .populate("endorsedBy", "fullName mobile email")
        .populate("endorsedTo", "fullName mobile email")
        .populate("connectionId", "status history");

      if (!result) {
        return res.status(404).json(new ApiError(404, "Endorsement not found"));
      }

      // Fetch profilePic manually using FileUpload
      const endorsedByUserId = result.endorsedBy?._id;
      const endorsedToUserId = result.endorsedTo?._id;

      const [endorsedByPic, endorsedToPic] = await Promise.all([
        FileUpload.findOne({ userId: endorsedByUserId, tag: "profilePic" }),
        FileUpload.findOne({ userId: endorsedToUserId, tag: "profilePic" }),
      ]);

      const responseData = {
        ...result.toObject(),
        endorsedBy: {
          ...result.endorsedBy.toObject(),
          fullName: result.endorsedBy?.fullName,
          profilePic: endorsedByPic?.url || null,
        },
        endorsedTo: {
          ...result.endorsedTo.toObject(),
          fullName: result.endorsedTo?.fullName,
          profilePic: endorsedToPic?.url || null,
        },
      };

      return res.status(200).json(
        new ApiResponse(200, responseData, "Data fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async updateEndorsementById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = (req as any).user;
      const {
        message,
        respect,
        timelines,
        wouldRehire,
        qualityOfWork,
        overallPerformance,
      } = req.body;

      const endorsement = await Endorsement.findById(req.params.id);
      if (!endorsement)
        return res.status(404).json(new ApiError(404, "Endorsement not found"));

      if (endorsement.fulfilled)
        return res.status(400).json(
          new ApiResponse(400, endorsement, "This endorsement has already been fulfilled.")
        );

      if (endorsement.endorsedBy.toString() !== userId.toString())
        return res
          .status(403)
          .json(new ApiError(403, "You are not authorized to update this endorsement"));

      // Check if user is a contractor or employer
      const userDoc = await User.findById(userId).select("userType").lean();
      if (!userDoc) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }

      if (userDoc.userType !== "contractor" && userDoc.userType !== "employer") {
        return res.status(403).json(new ApiError(403, "Only contractors and employers can approve endorsements"));
      }

      // Check if user has ENTERPRISE plan
      const enrolled = await EnrolledPlan.findOne({ user: userId, status: "active" }).populate("plan");
      const planType = (enrolled?.plan as any)?.planType;

      if (!enrolled || planType !== PlanType.ENTERPRISE) {
        return res.status(403).json(new ApiError(403, "Only users with ENTERPRISE plan can approve endorsements. Please upgrade your subscription."));
      }

      const connection = await ConnectionModel.findOne({
        $or: [
          {
            requester: endorsement.endorsedBy,
            recipient: endorsement.endorsedTo,
            status: ConnectionStatus.ACCEPTED,
          },
          {
            requester: endorsement.endorsedTo,
            recipient: endorsement.endorsedBy,
            status: ConnectionStatus.ACCEPTED,
          },
        ],
      });

      if (!connection)
        return res
          .status(403)
          .json(new ApiError(403, "A valid connection must exist to update this endorsement"));

      // --- Validation ---
      if (!message || !message.trim())
        return res.status(400).json(new ApiError(400, "Message is required"));

      if (![1, 2, 3, 4, 5].includes(Number(overallPerformance)))
        return res
          .status(400)
          .json(new ApiError(400, "Overall performance must be between 1 and 5"));

      const validTimelines = ["On-Time", "Delayed", "Ahead of Schedule"];
      if (!validTimelines.includes(timelines))
        return res.status(400).json(new ApiError(400, "Invalid timelines value"));

      const validQualities = ["Excellent", "Good", "Average", "Poor"];
      if (!validQualities.includes(qualityOfWork))
        return res.status(400).json(new ApiError(400, "Invalid quality of work value"));

      const validRespects = ["High", "Moderate", "Low"];
      if (!validRespects.includes(respect))
        return res.status(400).json(new ApiError(400, "Invalid respect value"));

      // --- Update ---
      endorsement.message = message.trim();
      endorsement.respect = respect;
      endorsement.timelines = timelines;
      endorsement.qualityOfWork = qualityOfWork;
      endorsement.wouldRehire = Boolean(wouldRehire);
      endorsement.overallPerformance = overallPerformance;
      endorsement.fulfilled = true;
      endorsement.status = "endorsed";
      endorsement.isRequest = false;

      const result = await endorsement.save();

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Endorsement updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteEndorsementById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await endorsementService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Endorsement"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async checkEndorsementEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(400).json(new ApiError(400, "User ID is required"));
      }

      const eligibility = await getEndorsementEligibility(userId);
      return res.status(200).json(
        new ApiResponse(200, eligibility, "Endorsement eligibility checked successfully")
      );
    } catch (err) {
      next(err);
    }
  }
}
