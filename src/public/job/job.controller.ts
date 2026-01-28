import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import { Job, JobStatus } from "../../modals/job.model";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { UserType } from "../../modals/notification.model";
import { CommonService } from "../../services/common.services";
import { UserPreference } from "../../modals/userpreference.model";
import { JobApplication } from "../../modals/jobapplication.model";
import { sendDualNotification } from "../../services/notification.service";
import { getJobListingUsage as fetchJobListingUsage } from "../../middlewares/jobListingLimitMiddleware";
import { SubscriptionPlan, ISubscriptionPlan, PlanType } from "../../modals/subscriptionplan.model";
import { EnrolledPlan, PlanEnrollmentStatus } from "../../modals/enrollplan.model";
import { getMonthKey } from "../../utils/date";
import { JobView } from "../../modals/jobView.model";

const JobService = new CommonService(Job);

export class JobController {
  static async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      // Fetch user's active enrollment plan
      const enrollment = await EnrolledPlan.findOne({
        user: userId,
        status: PlanEnrollmentStatus.ACTIVE,
      }).populate<{ plan: ISubscriptionPlan }>("plan");
      if (!enrollment) {
        throw new ApiError(403, "No active subscription plan found");
      }

      const plan = enrollment.plan as ISubscriptionPlan;
      if (!plan) {
        throw new ApiError(403, "No active subscription plan found");
      }

      // Determine job status
      const jobStatus =
        req.body.status === JobStatus.DRAFT
          ? JobStatus.DRAFT
          : JobStatus.PENDING_APPROVAL;

      /* ----------------------------------------------------
       * DRAFT JOB LIMIT CHECK
       * ---------------------------------------------------- */
      if (jobStatus === JobStatus.DRAFT) {
        const draftLimit = plan.saveDraftsLimit;

        // If draftLimit is null, it's unlimited; if 0 or undefined, drafts not allowed
        if (draftLimit === 0 || draftLimit === undefined) {
          throw new ApiError(403, "Your plan does not allow saving job drafts");
        }

        // limit !== null → enforce limit
        if (draftLimit !== null) {
          const draftCount = await Job.countDocuments({
            postedBy: userId,
            status: JobStatus.DRAFT,
          });

          if (draftCount >= draftLimit) {
            throw new ApiError(
              403,
              `Draft job limit reached. Your plan allows only ${draftLimit} draft jobs`
            );
          }
        }
      }

      /* ----------------------------------------------------
       * POSTED JOB LIMIT CHECK (NON-DRAFT)
       * ---------------------------------------------------- */
      // This is now handled by the enforceJobListingLimit middleware
      const jobListingLimit = (req as any).jobListingLimit;

      /* ----------------------------------------------------
       * CREATE JOB
       * ---------------------------------------------------- */
      const data = {
        ...req.body,
        postedBy: userId,
        status: jobStatus,
      };

      // Handle benefits that come as JSON strings from FormData
      if (data.benefits && Array.isArray(data.benefits)) {
        data.benefits = data.benefits.map((benefit: any) => {
          if (typeof benefit === "string") {
            try {
              return JSON.parse(benefit);
            } catch {
              return benefit;
            }
          }
          return benefit;
        });
      }

      // Handle skillsRequired - convert strings to objects with name field
      if (data.skillsRequired && Array.isArray(data.skillsRequired)) {
        data.skillsRequired = data.skillsRequired
          .filter((skill: any) => {
            // Filter out empty strings and null/undefined values
            if (typeof skill === "string") return skill.trim() !== "";
            if (typeof skill === "object" && skill.name) return skill.name.trim() !== "";
            return false;
          })
          .map((skill: any) => {
            // Convert strings to objects, keep existing objects
            if (typeof skill === "string") {
              return {
                name: skill.trim(),
                level: "intermediate",
                required: false
              };
            }
            return skill;
          });
      }

      // Extract imageUrl from S3 middleware array if it's an array
      if (data.imageUrl && Array.isArray(data.imageUrl) && data.imageUrl.length > 0) {
        data.imageUrl = data.imageUrl[0].url;
      }

      // Reconstruct location object from flat location fields
      const location: any = {};
      if (data.locationAddress) location.address = data.locationAddress;
      if (data.locationCity) location.city = data.locationCity;
      if (data.locationState) location.state = data.locationState;
      if (data.locationCountry) location.country = data.locationCountry;
      if (data.locationPostalCode) location.postalCode = data.locationPostalCode;
      if (data.locationRemoteFriendly !== undefined) location.isRemoteFriendly = data.locationRemoteFriendly;
      if (data.locationAllowsRelocation !== undefined) location.allowsRelocation = data.locationAllowsRelocation;

      // Only update location if we have any location data
      if (Object.keys(location).length > 0) {
        data.location = location;
      }

      // Remove flat location fields from data
      delete data.locationAddress;
      delete data.locationCity;
      delete data.locationState;
      delete data.locationCountry;
      delete data.locationPostalCode;
      delete data.locationRemoteFriendly;
      delete data.locationAllowsRelocation;

      const result = await JobService.create(data);
      if (!result) {
        throw new ApiError(400, "Failed to create job");
      }

      /* ----------------------------------------------------
       * RESPONSE (only for posted jobs)
       * ---------------------------------------------------- */
      const responsePayload =
        jobStatus === JobStatus.DRAFT
          ? result.toObject()
          : {
            ...result.toObject(),
            jobListingUsage: jobListingLimit ? {
              limit: jobListingLimit.limit,
              usedThisMonth: jobListingLimit.used + 1,
              remaining:
                jobListingLimit.limit !== null
                  ? Math.max(
                    jobListingLimit.limit - (jobListingLimit.used + 1),
                    0
                  )
                  : null,
            } : undefined,
          };

      return res
        .status(201)
        .json(new ApiResponse(201, responsePayload, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }



  static async uploadJobUpdated(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const imageUrlArray = req?.body?.imageUrl;
      // Extract the URL from the first element if it's an array
      const imageUrl = Array.isArray(imageUrlArray) && imageUrlArray.length > 0
        ? imageUrlArray[0].url
        : imageUrlArray;
      return res
        .status(201)
        .json(new ApiResponse(201, imageUrl, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobRole, category, city, workMode, jobType, minSalary, maxSalary, experience, search, industryId, subIndustryId } = req.query;

      // If user is logged in and is a contractor, enforce plan check
      const currentUser = (req as any).user;
      if (currentUser && currentUser.role === "contractor") {
        const enrolled = await EnrolledPlan.findOne({ user: currentUser.id, status: PlanEnrollmentStatus.ACTIVE }).populate<{ plan: ISubscriptionPlan }>("plan");
        // If no enrollment or plan is Free/Basic, do not show data
        const planType = (enrolled?.plan as ISubscriptionPlan | undefined)?.planType as PlanType | undefined;
        if (!enrolled || planType === PlanType.FREE || planType === PlanType.BASIC) {
          return res.status(403).json(new ApiError(403, "Your subscription plan does not allow viewing job listings"));
        }
      }

      // Build match stage dynamically
      const matchStage: any = {
        status: "open",
      };

      // Filter by category
      if (category) {
        matchStage.category = new (require("mongoose")).Types.ObjectId(category as string);
      }

      // Filter by industry
      if (industryId) {
        matchStage.industryId = new (require("mongoose")).Types.ObjectId(industryId as string);
      }

      // Filter by sub-industry
      if (subIndustryId) {
        matchStage.subIndustryId = new (require("mongoose")).Types.ObjectId(subIndustryId as string);
      }

      // Filter by city
      if (city) {
        matchStage["location.city"] = { $regex: city as string, $options: "i" };
      }

      // Filter by workMode
      if (workMode) {
        matchStage.workMode = workMode;
      }

      // Filter by jobType
      if (jobType) {
        matchStage.jobType = jobType;
      }

      // Filter by salary range
      if (minSalary || maxSalary) {
        matchStage["salary.min"] = {};
        if (minSalary) {
          matchStage["salary.min"]["$gte"] = parseInt(minSalary as string);
        }
        if (maxSalary) {
          matchStage["salary.max"] = matchStage["salary.max"] || {};
          matchStage["salary.max"]["$lte"] = parseInt(maxSalary as string);
        }
      }

      // Filter by experience level
      if (experience) {
        matchStage.experienceLevel = experience;
      }

      const pipeline = [
        {
          $match: matchStage
        },
        {
          $lookup: {
            from: "jobroles",
            localField: "attributes.jobRole",
            foreignField: "_id",
            as: "jobRoleDetails",
          },
        },
        {
          $unwind: {
            path: "$jobRoleDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Filter by job role if provided
        ...(jobRole ? [
          {
            $match: {
              $or: [
                { "jobRoleDetails._id": new (require("mongoose")).Types.ObjectId(jobRole as string) },
                { "jobRoleDetails.name": { $regex: jobRole as string, $options: "i" } }
              ]
            }
          }
        ] : []),
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "enrolledplans",
            let: { userId: "$userDetails._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$user", "$$userId"] },
                      { $eq: ["$status", "active"] },
                    ],
                  },
                },
              },
              {
                $lookup: {
                  from: "subscriptionplans",
                  localField: "plan",
                  foreignField: "_id",
                  as: "planDetails",
                },
              },
              { $unwind: { path: "$planDetails", preserveNullAndEmptyArrays: true } },
              { $project: { planType: "$planDetails.planType" } },
              { $limit: 1 },
            ],
            as: "userPlanDetails",
          },
        },
        {
          $unwind: {
            path: "$userPlanDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$userDetails._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePicFile",
          },
        },
        {
          $unwind: {
            path: "$profilePicFile",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "natureofworks",
            localField: "nature",
            foreignField: "_id",
            as: "natureDetails",
          },
        },
        {
          $unwind: { path: "$natureDetails", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "workercategories",
            localField: "category",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        {
          $unwind: {
            path: "$categoryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "industries",
            localField: "industryId",
            foreignField: "_id",
            as: "industryDetails",
          },
        },
        {
          $unwind: {
            path: "$industryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subindustries",
            localField: "subIndustryId",
            foreignField: "_id",
            as: "subIndustryDetails",
          },
        },
        {
          $unwind: {
            path: "$subIndustryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "trades",
            localField: "trades",
            foreignField: "_id",
            as: "tradesDetails",
          },
        },
        // Full-text search on title and description if search param provided
        ...(search ? [
          {
            $match: {
              $or: [
                { title: { $regex: search as string, $options: "i" } },
                { description: { $regex: search as string, $options: "i" } },
                { shortDescription: { $regex: search as string, $options: "i" } }
              ]
            }
          }
        ] : []),
        {
          $project: {
            _id: 1,
            tags: 1,
            title: 1,
            status: 1,
            salary: 1,
            metrics: 1,
            jobType: 1,
            priority: 1,
            // category: 1,
            teamSize: 1,
            location: 1,
            benefits: 1,
            workMode: 1,
            industry: 1,
            industryId: 1,
            subIndustryId: 1,
            userType: 1,
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            autoRepost: 1,
            categories: 1,
            publishedAt: 1,
            description: 1,
            workSchedule: 1,
            lastBoostedAt: 1,
            qualifications: 1,
            skillsRequired: 1,
            experienceLevel: 1,
            maxApplications: 1,
            shortDescription: 1,
            applicationProcess: 1,
            applicationDeadline: 1,
            creatorEmail: "$userDetails.email",
            creatorName: "$userDetails.fullName",
            profilePicUrl: "$profilePicFile.url",
            creatorMobile: "$userDetails.mobile",
            creatorUserType: "$userDetails.userType",
            creatorPlanType: "$userPlanDetails.planType",
            creatorHasEarlyAccessBadge: "$userDetails.hasEarlyAccessBadge",
            creatorHasPremium: "$userDetails.hasPremiumPlan",
            nature: {
              name: "$natureDetails.name",
              description: "$natureDetails.description",
            },
            category: {
              _id: "$categoryDetails._id",
              type: "$categoryDetails.type",
              description: "$categoryDetails.description",
            },
            industryInfo: {
              _id: "$industryDetails._id",
              name: "$industryDetails.name",
              icon: "$industryDetails.icon",
              description: "$industryDetails.description",
            },
            subIndustryInfo: {
              _id: "$subIndustryDetails._id",
              name: "$subIndustryDetails.name",
              icon: "$subIndustryDetails.icon",
              description: "$subIndustryDetails.description",
            },
            jobRole: {
              _id: "$jobRoleDetails._id",
              name: "$jobRoleDetails.name",
              slug: "$jobRoleDetails.slug",
              description: "$jobRoleDetails.description"
            },
            trades: {
              $map: {
                input: "$tradesDetails",
                as: "t",
                in: { name: "$$t.name", description: "$$t.description" },
              },
            },
          },
        },
      ];

      // Add priority ranking and sorting:
      // Rank by: Priority Level → Subscription Tier (Enterprise > Growth > Others) → Early Access Badge → Newest
      pipeline.push({
        $addFields: {
          priorityRank: {
            $switch: {
              branches: [
                // Rank 1: PRIORITY jobs from ENTERPRISE users
                {
                  case: {
                    $and: [
                      { $eq: ["$priority", "priority"] },
                      { $eq: ["$creatorPlanType", "enterprise"] },
                    ],
                  },
                  then: 1,
                },
                // Rank 2: PRIORITY jobs from GROWTH users
                {
                  case: {
                    $and: [
                      { $eq: ["$priority", "priority"] },
                      { $eq: ["$creatorPlanType", "growth"] },
                    ],
                  },
                  then: 2,
                },
                // Rank 3: PRIORITY jobs from other plans
                { case: { $eq: ["$priority", "priority"] }, then: 3 },
                // Rank 4: STANDARD jobs from ENTERPRISE users
                {
                  case: {
                    $and: [
                      { $eq: ["$priority", "standard"] },
                      { $eq: ["$creatorPlanType", "enterprise"] },
                    ],
                  },
                  then: 4,
                },
                // Rank 5: STANDARD jobs from GROWTH users
                {
                  case: {
                    $and: [
                      { $eq: ["$priority", "standard"] },
                      { $eq: ["$creatorPlanType", "growth"] },
                    ],
                  },
                  then: 5,
                },
                // Rank 6: STANDARD jobs from other plans
                { case: { $eq: ["$priority", "standard"] }, then: 6 },
              ],
              default: 7,
            },
          },
        },
      } as any);

      // Sort by priorityRank (ascending), early access badge, then newest
      pipeline.push({
        $sort: {
          priorityRank: 1,
          creatorHasEarlyAccessBadge: -1, // Early access badge holders first
          createdAt: -1,
        },
      } as any);

      const result = await JobService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllUserWiseJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$userDetails._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePicFile",
          },
        },
        {
          $unwind: {
            path: "$profilePicFile",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "industries",
            localField: "industryId",
            foreignField: "_id",
            as: "industryDetails",
          },
        },
        {
          $unwind: {
            path: "$industryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subindustries",
            localField: "subIndustryId",
            foreignField: "_id",
            as: "subIndustryDetails",
          },
        },
        {
          $unwind: {
            path: "$subIndustryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            tags: 1,
            title: 1,
            status: 1,
            salary: 1,
            metrics: 1,
            jobType: 1,
            priority: 1,
            teamSize: 1,
            location: 1,
            benefits: 1,
            workMode: 1,
            industry: 1,
            industryId: 1,
            subIndustryId: 1,
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            autoRepost: 1,
            categories: 1,
            publishedAt: 1,
            description: 1,
            workSchedule: 1,
            lastBoostedAt: 1,
            qualifications: 1,
            skillsRequired: 1,
            experienceLevel: 1,
            maxApplications: 1,
            shortDescription: 1,
            applicationProcess: 1,
            applicationDeadline: 1,
            profilePicUrl: "$profilePicFile.url",
            creatorName: "$userDetails.fullName",
            industryDetails: {
              _id: "$industryDetails._id",
              name: "$industryDetails.name",
            },
            subIndustryDetails: {
              _id: "$subIndustryDetails._id",
              name: "$subIndustryDetails.name",
            },
            category: {
              _id: "$categoryDetails._id",
              type: "$categoryDetails.type",
              description: "$categoryDetails.description",
            },
          },
        },
      ];
      const result = await JobService.getAll(
        { ...req.query, postedBy: user },
        pipeline
      );
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getMyJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user } = (req as any).user;
      const { userType } = req.query; // Filter by worker or contractor

      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$userDetails._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePicFile",
          },
        },
        {
          $unwind: {
            path: "$profilePicFile",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "industries",
            localField: "industryId",
            foreignField: "_id",
            as: "industryDetails",
          },
        },
        {
          $unwind: {
            path: "$industryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subindustries",
            localField: "subIndustryId",
            foreignField: "_id",
            as: "subIndustryDetails",
          },
        },
        {
          $unwind: {
            path: "$subIndustryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            tags: 1,
            title: 1,
            status: 1,
            salary: 1,
            metrics: 1,
            jobType: 1,
            priority: 1,
            teamSize: 1,
            location: 1,
            benefits: 1,
            workMode: 1,
            industry: 1,
            industryId: 1,
            subIndustryId: 1,
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            autoRepost: 1,
            categories: 1,
            publishedAt: 1,
            description: 1,
            workSchedule: 1,
            lastBoostedAt: 1,
            qualifications: 1,
            skillsRequired: 1,
            experienceLevel: 1,
            maxApplications: 1,
            shortDescription: 1,
            applicationProcess: 1,
            applicationDeadline: 1,
            userType: 1,
            profilePicUrl: "$profilePicFile.url",
            creatorName: "$userDetails.fullName",
            industryDetails: {
              _id: "$industryDetails._id",
              name: "$industryDetails.name",
            },
            subIndustryDetails: {
              _id: "$subIndustryDetails._id",
              name: "$subIndustryDetails.name",
            },
            category: {
              _id: "$categoryDetails._id",
              type: "$categoryDetails.type",
              description: "$categoryDetails.description",
            },
          },
        },
      ];

      // Build query object with optional userType filter
      const queryObj: any = { ...req.query, postedBy: user };
      if (userType) {
        queryObj.userType = userType;
      }
      // Remove userType from query to avoid duplicate filtering
      delete queryObj.userType;

      const result = await JobService.getAll(
        { ...queryObj, ...(userType && { userType }) },
        pipeline
      );
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllSuggestedJobsByUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req as any)?.user?.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid or missing user ID.");
      }
      const [preferences, applications] = await Promise.all([
        UserPreference.findOne({ userId }),
        JobApplication.find({ applicant: userId }, { job: 1 }).lean(),
      ]);

      const appliedJobIds = applications.map(
        (app) => new mongoose.Types.ObjectId(app.job)
      );
      const matchStage: Record<string, any> = {
        _id: { $nin: appliedJobIds },
        status: "open",
      };

      // Apply filters from preferences
      if (preferences?.jobType) matchStage.jobType = preferences.jobType;
      if (preferences?.workModes) matchStage.workMode = preferences.workModes;
      if (preferences?.experienceLevel)
        matchStage.experienceLevel = preferences.experienceLevel;
      if (preferences?.jobRole)
        matchStage.category = new mongoose.Types.ObjectId(preferences.jobRole);
      if (
        Array.isArray(preferences?.preferredLocations) &&
        preferences.preferredLocations.length > 0
      ) {
        matchStage["location.city"] = {
          $in: preferences.preferredLocations.map((city) => city.toLowerCase()),
        };
      }
      if (
        preferences?.salaryExpectation?.amount &&
        preferences?.salaryExpectation?.frequency
      ) {
        matchStage["salary.min"] = {
          $gte: preferences.salaryExpectation.amount,
        };
        matchStage["salary.period"] = preferences.salaryExpectation.frequency;
      }

      // Pagination and sorting
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const sortBy: any = req.query.sortBy || "createdAt";
      const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

      const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { [sortBy]: sortOrder } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$userDetails._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePicFile",
          },
        },
        {
          $unwind: {
            path: "$profilePicFile",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            status: 1,
            salary: 1,
            jobType: 1,
            priority: 1,
            teamSize: 1,
            location: 1,
            benefits: 1,
            workMode: 1,
            industry: 1,
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            publishedAt: 1,
            skillsRequired: 1,
            experienceLevel: 1,
            shortDescription: 1,
            applicationDeadline: 1,
            profilePicUrl: "$profilePicFile.url",
            creatorName: "$userDetails.fullName",
            category: {
              _id: "$categoryDetails._id",
              type: "$categoryDetails.type",
              description: "$categoryDetails.description",
            },
          },
        },
      ];

      const jobs = await Job.aggregate(pipeline);
      const total = await Job.countDocuments(matchStage);

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            result: jobs,
            pagination: {
              totalItems: total,
              currentPage: page,
              itemsPerPage: limit,
              totalPages: Math.ceil(total / limit),
            },
          },
          "Suggested jobs fetched successfully"
        )
      );
    } catch (err: any) {
      console.log("❌ Error in getAllSuggestedJobsByUser:", err);
      return next(
        err instanceof ApiError
          ? err
          : new ApiError(500, "Failed to fetch suggested jobs")
      );
    }
  }

  static async getJobById(req: Request, res: Response, next: NextFunction) {
    try {

      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$userDetails._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePicFile",
          },
        },
        {
          $unwind: {
            path: "$profilePicFile",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "jobcategories",
            localField: "category",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        {
          $unwind: {
            path: "$categoryInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "natureofworks",
            localField: "nature",
            foreignField: "_id",
            as: "natureDetails",
          },
        },
        {
          $unwind: {
            path: "$natureDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "trades",
            localField: "trades",
            foreignField: "_id",
            as: "tradesDetails",
          },
        },
        {
          $lookup: {
            from: "industries",
            localField: "industryId",
            foreignField: "_id",
            as: "industryDetails",
          },
        },
        {
          $unwind: {
            path: "$industryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subindustries",
            localField: "subIndustryId",
            foreignField: "_id",
            as: "subIndustryDetails",
          },
        },
        {
          $unwind: {
            path: "$subIndustryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            _id: 1,
            tags: 1,
            title: 1,
            status: 1,
            salary: 1,
            metrics: 1,
            jobType: 1,
            priority: 1,
            userType: 1,
            teamSize: 1,
            location: 1,
            benefits: 1,
            workMode: 1,
            industry: 1,
            imageUrl: 1,
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            autoRepost: 1,
            categories: 1,
            publishedAt: 1,
            description: 1,
            workSchedule: 1,
            lastBoostedAt: 1,
            qualifications: 1,
            skillsRequired: 1,
            experienceLevel: 1,
            maxApplications: 1,
            shortDescription: 1,
            applicationProcess: 1,
            applicationDeadline: 1,
            creatorID: "$userDetails._id",
            profilePicUrl: "$profilePicFile.url",
            creatorName: "$userDetails.fullName",
            category: {
              _id: {
                $ifNull: [
                  "$categoryInfo._id",
                  "$category"
                ]
              },
              name: {
                $ifNull: [
                  "$categoryInfo.name",
                  null
                ]
              }
            },
            nature: {
              _id: "$natureDetails._id",
              name: "$natureDetails.name",
            },
            trades: {
              $cond: [
                { $gt: [{ $size: "$tradesDetails" }, 0] },
                {
                  $map: {
                    input: "$tradesDetails",
                    as: "t",
                    in: { _id: "$$t._id", name: "$$t.name" },
                  }
                },
                {
                  $map: {
                    input: "$trades",
                    as: "t",
                    in: { _id: "$$t", name: null },
                  }
                }
              ]
            },
            industryDetails: {
              _id: "$industryDetails._id",
              name: "$industryDetails.name",
            },
            subIndustryDetails: {
              _id: "$subIndustryDetails._id",
              name: "$subIndustryDetails.name",
            },
          },
        },
      ];
      let result: any = await JobService.getAll(
        { ...req.query, _id: req.params.id },
        pipeline
      );
      result = result?.result?.[0];

      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Job not found"));
      }

      const currentUser = (req as any).user;

      if (
        currentUser &&
        currentUser.role === "contractor" &&
        currentUser.role === "employer" &&
        result.creatorID.toString() !== currentUser.id.toString()
      ) {
        const monthKey = getMonthKey();

        // Fetch active plan enrollment (contractor / employer only)
        const enrolled = await EnrolledPlan.findOne({
          user: currentUser.id,
          status: PlanEnrollmentStatus.ACTIVE,
        }).populate<{ plan: ISubscriptionPlan }>("plan");

        if (!enrolled || !enrolled.plan) {
          throw new ApiError(403, "No active subscription plan found");
        }

        const limit: number | null = enrolled.plan.jobViewPerMonth ?? null;

        const alreadyViewed = await JobView.exists({
          user: currentUser.id,
          job: req.params.id,
          monthKey,
        });

        if (!alreadyViewed) {
          if (limit !== null) {
            const usedViews = await JobView.countDocuments({
              user: currentUser.id,
              monthKey,
            });

            if (usedViews >= limit) {
              throw new ApiError(
                403,
                "Monthly job view limit reached. Upgrade your plan to continue."
              );
            }
          }

          await JobView.create({
            user: currentUser.id,
            job: req.params.id,
            monthKey,
          });
        }
      }

      // Check if user is authenticated and has applied for this job
      let isApplied = false;
      const userId = (req as any).user?.id;

      if (userId) {
        const application = await JobApplication.findOne({
          job: req.params.id,
          applicant: userId,
        });
        isApplied = !!application;
      }

      // Add isApplied to result
      result.isApplied = isApplied;

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const { role } = (req as any).user;

      const record = await JobService.getById(id);
      if (!record) {
        return res.status(404).json(new ApiError(404, "Job not found."));
      }

      const data = req.body;
      if (role !== "admin") delete data.status;

      // Handle imageUrl if it was uploaded
      if (data.imageUrl) {
        if (Array.isArray(data.imageUrl) && data.imageUrl.length > 0 && data.imageUrl[0]?.url) {
          // URL array from S3 middleware
          data.imageUrl = data.imageUrl[0].url;
        } else if (typeof data.imageUrl === "object" && data.imageUrl?.url) {
          // Single object with url property
          data.imageUrl = data.imageUrl.url;
        } else if (typeof data.imageUrl === "string" && data.imageUrl && !data.imageUrl.startsWith("http") && !data.imageUrl.startsWith("/")) {
          // If it's a non-URL string (like "img"), don't update it - keep the existing one
          delete data.imageUrl;
        } else if (typeof data.imageUrl === "string" && (data.imageUrl.startsWith("http") || data.imageUrl.startsWith("/"))) {
          // Valid URL string, keep it
        } else {
          // Any other case, remove imageUrl from update
          delete data.imageUrl;
        }
      }

      // Handle benefits that come as JSON strings from FormData
      if (data.benefits && Array.isArray(data.benefits)) {
        data.benefits = data.benefits.map((benefit: any) => {
          if (typeof benefit === "string") {
            try {
              return JSON.parse(benefit);
            } catch {
              return benefit;
            }
          }
          return benefit;
        });
      }

      // Handle skillsRequired - convert strings to objects with name field
      if (data.skillsRequired && Array.isArray(data.skillsRequired)) {
        data.skillsRequired = data.skillsRequired
          .filter((skill: any) => {
            // Filter out empty strings and null/undefined values
            if (typeof skill === "string") return skill.trim() !== "";
            if (typeof skill === "object" && skill.name) return skill.name.trim() !== "";
            return false;
          })
          .map((skill: any) => {
            // Convert strings to objects, keep existing objects
            if (typeof skill === "string") {
              return {
                name: skill.trim(),
                level: "intermediate",
                required: false
              };
            }
            return skill;
          });
      }

      // Reconstruct location object from flat location fields
      const location: any = {};
      if (data.locationAddress) location.address = data.locationAddress;
      if (data.locationCity) location.city = data.locationCity;
      if (data.locationState) location.state = data.locationState;
      if (data.locationCountry) location.country = data.locationCountry;
      if (data.locationPostalCode) location.postalCode = data.locationPostalCode;
      if (data.locationRemoteFriendly !== undefined) location.isRemoteFriendly = data.locationRemoteFriendly;
      if (data.locationAllowsRelocation !== undefined) location.allowsRelocation = data.locationAllowsRelocation;

      // Only update location if we have any location data
      if (Object.keys(location).length > 0) {
        data.location = location;
      }

      // Remove flat location fields from data
      delete data.locationAddress;
      delete data.locationCity;
      delete data.locationState;
      delete data.locationCountry;
      delete data.locationPostalCode;
      delete data.locationRemoteFriendly;
      delete data.locationAllowsRelocation;

      const result = await JobService.updateById(req.params.id, data);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update worker category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JobService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete worker category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateJobStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id, role } = (req as any).user;
      const { status } = req.body;
      if (!status)
        return res.status(400).json(new ApiError(400, "Status is required"));

      const result = await JobService.updateById(req.params.id, { status });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update job status"));

      if (result?.status !== status) {
        const [jobDoc, userDoc]: any = await Promise.all([
          Job.findById(req.params.id).select("status title postedBy"),
          User.findById(result.postedBy).select("fullName email mobile"),
        ]);
        await sendDualNotification({
          type: "job-status-update",
          context: {
            status: status,
            jobTitle: jobDoc?.title,
            userName: userDoc.fullName,
          },
          senderId: id,
          receiverId: userDoc._id,
          senderRole: UserType.ADMIN,
          receiverRole: userDoc.userType,
        });
      }
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Job status updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async addJobComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { comment } = req.body;
      const { id: jobId } = req.params;
      const { id: adminId } = (req as any).user;

      if (!comment?.trim()) {
        return res.status(400).json(new ApiError(400, "Comment is required"));
      }

      const jobDoc = await Job.findById(jobId);
      if (!jobDoc)
        return res.status(404).json(new ApiError(404, "Job not found"));

      // Push comment
      jobDoc.history.push({
        comment,
        commentedBy: adminId,
        timestamp: new Date(),
      });
      await jobDoc.save();

      // Send notification to job poster
      const userDoc = await User.findById(jobDoc.postedBy);
      if (userDoc) {
        await sendDualNotification({
          type: "job-comment-added",
          context: {
            comment,
            jobTitle: jobDoc.title,
            userName: userDoc.fullName,
          },
          senderId: adminId,
          senderRole: UserType.ADMIN,
          receiverRole: userDoc.userType,
          receiverId: userDoc._id as any,
        });
      }

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Comment added and user notified"));
    } catch (err) {
      next(err);
    }
  }

  static async getJobWithHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const jobId = req.params.id;
      if (!jobId)
        return res.status(400).json(new ApiError(400, "Job ID is required"));

      const job = await Job.findById(jobId)
        .populate("postedBy", "fullName email userType")
        .populate("history.commentedBy", "username email")
        .lean();

      if (!job) {
        return res.status(404).json(new ApiError(404, "Job not found"));
      }

      job.history = (job.history || []).sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return res
        .status(200)
        .json(new ApiResponse(200, job.history, "Job with history fetched"));
    } catch (err) {
      next(err);
    }
  }

  static async getJobListingUsage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { user } = req as any;
      if (!user?.id) {
        return res.status(401).json(new ApiError(401, "Unauthorized user"));
      }

      if (!["employer", "contractor"].includes(user.role)) {
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              "Job listing usage is only available to employers and contractors"
            )
          );
      }

      const usage = await fetchJobListingUsage(user.id);

      return res
        .status(200)
        .json(
          new ApiResponse(200, usage, "Job listing usage fetched successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getJobCities(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const cities = await Job.aggregate([
        {
          $match: {
            // status: "open",
            "location.city": { $nin: [null, ""] }
          }
        },
        {
          $group: {
            _id: { $toLower: "$location.city" }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            city: "$_id",
            _id: 0
          }
        }
      ]);

      if (!cities || cities.length === 0) {
        return res
          .status(200)
          .json(new ApiResponse(200, [], "No cities found with job listings"));
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            cities.map(c => c.city),
            "Cities fetched successfully"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllContractorJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const currentUserId = (req as any).user?.id;
      const { city, workMode, jobType, minSalary, maxSalary, experience, search, industryId, subIndustryId } = req.query;

      // Build match stage for contractor jobs
      const matchStage: any = {
        status: "open",
        userType: "contractor",
        ...(currentUserId && { postedBy: { $ne: new mongoose.Types.ObjectId(currentUserId) } })
      };

      // Filter by city
      if (city) {
        matchStage["location.city"] = { $regex: city as string, $options: "i" };
      }

      // Filter by industry
      if (industryId) {
        matchStage.industryId = new mongoose.Types.ObjectId(industryId as string);
      }

      // Filter by sub-industry
      if (subIndustryId) {
        matchStage.subIndustryId = new mongoose.Types.ObjectId(subIndustryId as string);
      }

      // Filter by workMode
      if (workMode) {
        matchStage.workMode = workMode;
      }

      // Filter by jobType
      if (jobType) {
        matchStage.jobType = jobType;
      }

      // Filter by salary range
      if (minSalary || maxSalary) {
        matchStage["salary.min"] = {};
        if (minSalary) {
          matchStage["salary.min"]["$gte"] = parseInt(minSalary as string);
        }
        if (maxSalary) {
          matchStage["salary.max"] = matchStage["salary.max"] || {};
          matchStage["salary.max"]["$lte"] = parseInt(maxSalary as string);
        }
      }

      // Filter by experience level
      if (experience) {
        matchStage.experienceLevel = experience;
      }

      const pipeline = [
        {
          $match: matchStage
        },
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "enrolledplans",
            let: { userId: "$userDetails._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$user", "$$userId"] },
                      { $eq: ["$status", "active"] },
                    ],
                  },
                },
              },
              {
                $lookup: {
                  from: "subscriptionplans",
                  localField: "plan",
                  foreignField: "_id",
                  as: "planDetails",
                },
              },
              { $unwind: { path: "$planDetails", preserveNullAndEmptyArrays: true } },
              { $project: { planType: "$planDetails.planType" } },
              { $limit: 1 },
            ],
            as: "userPlanDetails",
          },
        },
        {
          $unwind: {
            path: "$userPlanDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$userDetails._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePicFile",
          },
        },
        {
          $unwind: {
            path: "$profilePicFile",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "natureofworks",
            localField: "nature",
            foreignField: "_id",
            as: "natureDetails",
          },
        },
        {
          $unwind: { path: "$natureDetails", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "industries",
            localField: "industryId",
            foreignField: "_id",
            as: "industryDetails",
          },
        },
        {
          $unwind: {
            path: "$industryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subindustries",
            localField: "subIndustryId",
            foreignField: "_id",
            as: "subIndustryDetails",
          },
        },
        {
          $unwind: {
            path: "$subIndustryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "trades",
            localField: "trades",
            foreignField: "_id",
            as: "tradesDetails",
          },
        },
        // Full-text search on title and description if search param provided
        ...(search ? [
          {
            $match: {
              $or: [
                { title: { $regex: search as string, $options: "i" } },
                { description: { $regex: search as string, $options: "i" } },
                { shortDescription: { $regex: search as string, $options: "i" } }
              ]
            }
          }
        ] : []),
        {
          $project: {
            _id: 1,
            tags: 1,
            title: 1,
            status: 1,
            salary: 1,
            metrics: 1,
            jobType: 1,
            priority: 1,
            teamSize: 1,
            location: 1,
            benefits: 1,
            workMode: 1,
            industry: 1,
            industryId: 1,
            subIndustryId: 1,
            userType: 1,
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            autoRepost: 1,
            categories: 1,
            publishedAt: 1,
            description: 1,
            workSchedule: 1,
            lastBoostedAt: 1,
            qualifications: 1,
            skillsRequired: 1,
            experienceLevel: 1,
            maxApplications: 1,
            shortDescription: 1,
            applicationProcess: 1,
            applicationDeadline: 1,
            creatorEmail: "$userDetails.email",
            creatorName: "$userDetails.fullName",
            profilePicUrl: "$profilePicFile.url",
            creatorMobile: "$userDetails.mobile",
            creatorUserType: "$userDetails.userType",
            creatorPlanType: "$userPlanDetails.planType",
            creatorHasEarlyAccessBadge: "$userDetails.hasEarlyAccessBadge",
            creatorHasPremium: "$userDetails.hasPremiumPlan",
            nature: {
              name: "$natureDetails.name",
              description: "$natureDetails.description",
            },
            industryInfo: {
              _id: "$industryDetails._id",
              name: "$industryDetails.name",
              icon: "$industryDetails.icon",
              description: "$industryDetails.description",
            },
            subIndustryInfo: {
              _id: "$subIndustryDetails._id",
              name: "$subIndustryDetails.name",
              icon: "$subIndustryDetails.icon",
              description: "$subIndustryDetails.description",
            },
            trades: {
              $map: {
                input: "$tradesDetails",
                as: "t",
                in: { name: "$$t.name", description: "$$t.description" },
              },
            },
          },
        },
      ];

      // Add priority ranking and sorting
      pipeline.push({
        $addFields: {
          priorityRank: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $eq: ["$priority", "priority"] },
                      { $eq: ["$creatorPlanType", "enterprise"] },
                    ],
                  },
                  then: 1,
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$priority", "priority"] },
                      { $eq: ["$creatorPlanType", "growth"] },
                    ],
                  },
                  then: 2,
                },
                { case: { $eq: ["$priority", "priority"] }, then: 3 },
                {
                  case: {
                    $and: [
                      { $eq: ["$priority", "standard"] },
                      { $eq: ["$creatorPlanType", "enterprise"] },
                    ],
                  },
                  then: 4,
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$priority", "standard"] },
                      { $eq: ["$creatorPlanType", "growth"] },
                    ],
                  },
                  then: 5,
                },
                { case: { $eq: ["$priority", "standard"] }, then: 6 },
              ],
              default: 7,
            },
          },
        },
      } as any);

      pipeline.push({
        $sort: {
          priorityRank: 1,
          creatorHasEarlyAccessBadge: -1,
          createdAt: -1,
        },
      } as any);

      const result = await JobService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Contractor jobs fetched successfully"));
    } catch (err) {
      next(err);
    }
  }
}
