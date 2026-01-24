import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Job, JobStatus } from "../../modals/job.model";
import { Request, Response, NextFunction } from "express";
import {
  JobApplication,
  ApplicationStatus,
} from "../../modals/jobapplication.model";
import mongoose from "mongoose";
import { User } from "../../modals/user.model";
import { UserType } from "../../modals/notification.model";
import { CommonService } from "../../services/common.services";
import { sendDualNotification } from "../../services/notification.service";
import { EnrolledPlan, PlanEnrollmentStatus } from "../../modals/enrollplan.model";
import { ISubscriptionPlan, PlanType } from "../../modals/subscriptionplan.model";

const JobApplicationService = new CommonService(JobApplication);

// Helper function to get job application eligibility and monthly application limit
const getJobApplicationEligibility = async (userId: string) => {
  // Get user's active subscription plan
  const enrolledPlan = await EnrolledPlan.findOne({
    user: userId,
    status: "active",
  }).populate("plan");

  // Default eligibility for FREE plan
  let planType = PlanType.FREE;
  let monthlyLimit = 5;

  if (enrolledPlan) {
    planType = (enrolledPlan.plan as any).planType;
    
    // Set monthly limits based on plan type
    if (planType === PlanType.BASIC) {
      monthlyLimit = 20;
    } else if (planType === PlanType.PREMIUM) {
      monthlyLimit = Infinity; // Unlimited
    }
  }

  // Count applications in current month (from 1st of current month to today)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const applicationsThisMonth = await JobApplication.countDocuments({
    applicant: userId,
    createdAt: {
      $gte: firstDayOfMonth,
      $lte: lastDayOfMonth,
    },
  });

  const applicationsRemaining = monthlyLimit === Infinity ? Infinity : Math.max(0, monthlyLimit - applicationsThisMonth);

  return {
    planType: planType,
    monthlyLimit: monthlyLimit,
    applicationsThisMonth: applicationsThisMonth,
    applicationsRemaining: applicationsRemaining,
    eligible: applicationsRemaining > 0,
    message:
      applicationsRemaining === 0
        ? `You have reached your monthly job application limit (${monthlyLimit}). Please upgrade your subscription or try again next month.`
        : `You have ${applicationsRemaining === Infinity ? "unlimited" : applicationsRemaining} applications remaining this month.`,
  };
};

// Helper function to get contractor job application eligibility
const getContractorJobApplicationEligibility = async (userId: string) => {
  // Get user's active subscription plan
  const enrolledPlan = await EnrolledPlan.findOne({
    user: userId,
    status: "active",
  }).populate("plan");

  // Default eligibility for FREE plan - no applications allowed
  let planType = PlanType.FREE;
  let monthlyLimit = 0;
  let priorityApply = false;
  let applyVisibility = "standard"; // default mode

  if (enrolledPlan) {
    const plan = (enrolledPlan.plan as any);
    planType = plan.planType;
    
    // Set monthly limits and features based on plan type for contractors
    if (planType === PlanType.BASIC) {
      monthlyLimit = 10;
      priorityApply = false;
      applyVisibility = "standard";
    } else if (planType === PlanType.GROWTH) {
      monthlyLimit = 50;
      priorityApply = false;
      applyVisibility = "highlighted";
    } else if (planType === PlanType.ENTERPRISE) {
      monthlyLimit = Infinity; // Unlimited
      priorityApply = true;
      applyVisibility = "featured";
    }
  }

  // Count applications in current month (from 1st of current month to today)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const applicationsThisMonth = await JobApplication.countDocuments({
    applicant: userId,
    createdAt: {
      $gte: firstDayOfMonth,
      $lte: lastDayOfMonth,
    },
  });

  const applicationsRemaining = monthlyLimit === Infinity ? Infinity : Math.max(0, monthlyLimit - applicationsThisMonth);

  return {
    planType: planType,
    monthlyLimit: monthlyLimit,
    applicationsThisMonth: applicationsThisMonth,
    applicationsRemaining: applicationsRemaining,
    priorityApply: priorityApply,
    applyVisibility: applyVisibility,
    eligible: applicationsRemaining > 0,
    message:
      monthlyLimit === 0
        ? "Your current plan does not allow applying to employer jobs. Please upgrade to BASIC or above."
        : applicationsRemaining === 0
        ? `You have reached your monthly job application limit (${monthlyLimit}). Please upgrade your subscription or try again next month.`
        : `You have ${applicationsRemaining === Infinity ? "unlimited" : applicationsRemaining} applications remaining this month.`,
  };
};

/**
 * Resets job metrics by jobId.
 */
export const resetJobMetrics = async (jobId: string) => {
  try {
    const aggregatedMetrics = await JobApplication.aggregate([
      { $match: { job: new mongoose.Types.ObjectId(jobId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const defaultMetrics: any = {
      hired: 0,
      applied: 0,
      offered: 0,
      rejected: 0,
      interview: 0,
      withdrawn: 0,
      shortlisted: 0,
      under_review: 0,
      offer_declined: 0,
      offer_accepted: 0,
    };
    for (const { _id, count } of aggregatedMetrics) {
      if (_id in defaultMetrics) {
        defaultMetrics[_id] = count;
      }
    }
    await Job.findByIdAndUpdate(jobId, {
      $set: { metrics: defaultMetrics },
    });
  } catch (err) {
    console.log(`❌ Failed to update metrics for jobId ${jobId}:`, err);
  }
};

export const applyToJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const applicantId = (req as any).user.id;
    const {
      job,
      answers,
      resumeUrl,
      coverLetter,
      availability,
      expectedSalary,
    } = req.body;

    if (!job || !resumeUrl) {
      return res
        .status(400)
        .json(new ApiError(400, "Job ID and resume URL are required"));
    }

    const [jobDoc, userDoc]: any = await Promise.all([
      Job.findById(job).select("status title postedBy"),
      User.findById(applicantId).select("fullName email mobile userType"),
    ]);

    // Check monthly job application limit for workers only
    if (userDoc && userDoc.userType === "worker") {
      const jobAppEligibility = await getJobApplicationEligibility(applicantId);
      if (!jobAppEligibility.eligible) {
        return res.status(403).json(
          new ApiError(403, jobAppEligibility.message)
        );
      }
    }

    // Check monthly job application limit for contractors
    if (userDoc && userDoc.userType === "contractor") {
      const contractorEligibility = await getContractorJobApplicationEligibility(applicantId);
      if (!contractorEligibility.eligible) {
        return res.status(403).json(
          new ApiError(403, contractorEligibility.message)
        );
      }
    }

    let receiver: any;
    if (jobDoc?.postedBy) {
      receiver = await User.findById(jobDoc.postedBy).select("_id userType");
      if (!receiver)
        return res
          .status(404)
          .json(new ApiError(404, "Posted Job User not found"));
    }

    if (!jobDoc || jobDoc.status !== JobStatus.OPEN) {
      return res
        .status(400)
        .json(new ApiError(400, "Job not open for application"));
    }

    if (!userDoc) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const existing = await JobApplication.findOne({
      job,
      applicant: applicantId,
    });
    if (existing) {
      return res
        .status(409)
        .json(new ApiError(409, "Already applied to this job"));
    }

    const application = await JobApplication.create({
      job,
      answers,
      resumeUrl,
      coverLetter,
      availability,
      expectedSalary,
      applicant: applicantId,
      applicantSnapshot: {
        email: userDoc.email,
        phone: userDoc.mobile,
        name: userDoc.fullName,
      },
      history: [{ status: ApplicationStatus.APPLIED }],
    });

    if (jobDoc && receiver._id)
      await sendDualNotification({
        type: "application-status-update",
        context: {
          jobTitle: jobDoc?.title,
          userName: userDoc.fullName,
          status: ApplicationStatus.APPLIED,
        },
        senderId: applicantId,
        receiverId: receiver._id,
        senderRole: UserType.WORKER,
        receiverRole: receiver.userType,
      });

    // Update fast responder score after job application
    try {
      const { updateFastResponderScore } = await import("../../services/fastResponder.service");
      await updateFastResponderScore(applicantId);
    } catch (error) {
      console.error("Error updating fast responder score:", error);
    }

    await resetJobMetrics(job);
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          application,
          "Job application submitted successfully"
        )
      );
  } catch (err) {
    next(err);
  }
};

export const getUserApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const applicantId = (req as any)?.user?.id;

    if (!applicantId || !mongoose.Types.ObjectId.isValid(applicantId)) {
      throw new ApiError(400, "Invalid or missing user ID.");
    }

    const matchStage: Record<string, any> = {
      applicant: new mongoose.Types.ObjectId(applicantId),
    };

    if (req.query.status) {
      matchStage.status = req.query.status;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const sortBy: any = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "jobs",
          localField: "job",
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      { $unwind: "$jobDetails" },
      {
        $lookup: {
          from: "users",
          localField: "jobDetails.postedBy",
          foreignField: "_id",
          as: "posterDetails",
        },
      },
      { $unwind: "$posterDetails" },
      {
        $lookup: {
          from: "fileuploads",
          let: { userId: "$posterDetails._id" },
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
          status: 1,
          history: 1,
          resumeUrl: 1,
          createdAt: 1,
          updatedAt: 1,
          coverLetter: 1,
          availability: 1,
          expectedSalary: 1,
          applicantSnapshot: 1,
          jobId: "$jobDetails._id",
          jobTitle: "$jobDetails.title",
          jobType: "$jobDetails.jobType",
          industry: "$jobDetails.industry",
          priority: "$jobDetails.priority",
          workMode: "$jobDetails.workMode",
          jobCategory: "$jobDetails.category",
          jobLocation: "$jobDetails.location",
          profilePicUrl: "$profilePicFile.url",
          description: "$jobDetails.description",
          creatorName: "$posterDetails.fullName",
          skillsRequired: "$jobDetails.skillsRequired",
          experienceLevel: "$jobDetails.experienceLevel",
        },
      },
      { $sort: { [sortBy]: sortOrder } },
      { $skip: skip },
      { $limit: limit },
    ];

    const applications = await JobApplication.aggregate(pipeline);
    const total = await JobApplication.countDocuments(matchStage);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          result: applications,
          pagination: {
            totalItems: total,
            currentPage: page,
            itemsPerPage: limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        "Applications fetched"
      )
    );
  } catch (err) {
    console.log("❌ Error in getUserApplications:", err);
    return next(
      err instanceof ApiError
        ? err
        : new ApiError(500, "Failed to fetch applications")
    );
  }
};

export const getReceivedApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: userId, role } = (req as any).user;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or missing user ID."));
    }

    if (![UserType.EMPLOYER, UserType.CONTRACTOR].includes(role)) {
      return res.status(404).json(new ApiError(403, "Unauthorized access."));
    }

    // If the requester is a contractor, enforce subscription plan check
    if (role === UserType.CONTRACTOR) {
      const enrolled = await EnrolledPlan.findOne({ user: userId, status: PlanEnrollmentStatus.ACTIVE }).populate<{ plan: ISubscriptionPlan }>("plan");
      const planType = (enrolled?.plan as ISubscriptionPlan | undefined)?.planType as PlanType | undefined;
      if (!enrolled || planType === PlanType.FREE || planType === PlanType.BASIC) {
        return res.status(403).json(new ApiError(403, "Your subscription plan does not allow viewing received applications"));
      }
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const sortBy: any = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const statusFilter = req.query.status as string;
    const search = (req.query.search as string)?.trim();
    const jobIdFilter = req.query.job as string;

    const matchConditions: any = [];

    // Match only jobs posted by current user
    matchConditions.push({
      "jobDetails.postedBy": new mongoose.Types.ObjectId(userId),
    });
    if (statusFilter) matchConditions.push({ status: statusFilter });

    if (jobIdFilter && mongoose.Types.ObjectId.isValid(jobIdFilter)) {
      matchConditions.push({ job: new mongoose.Types.ObjectId(jobIdFilter) });
    }

    if (search) {
      matchConditions.push({
        $or: [
          { "jobDetails.title": { $regex: search, $options: "i" } },
          { "applicantDetails.fullName": { $regex: search, $options: "i" } },
        ],
      });
    }

    const pipeline: any[] = [
      {
        $lookup: {
          from: "jobs",
          localField: "job",
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      { $unwind: "$jobDetails" },
      {
        $lookup: {
          from: "users",
          localField: "applicant",
          foreignField: "_id",
          as: "applicantDetails",
        },
      },
      { $unwind: "$applicantDetails" },
      {
        $lookup: {
          from: "candidatebrandingbadges",
          localField: "applicant",
          foreignField: "user",
          as: "badgeDetails",
        },
      },
      {
        $addFields: {
          candidateBadges: "$badgeDetails",
        },
      },
      {
        $lookup: {
          from: "fileuploads",
          let: { userId: "$applicant" },
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
        $addFields: {
          profilePic: { $arrayElemAt: ["$profilePicFile.url", 0] },
        },
      },
      { $match: matchConditions.length ? { $and: matchConditions } : {} },
      {
        $project: {
          _id: 1,
          status: 1,
          history: 1,
          resumeUrl: 1,
          createdAt: 1,
          coverLetter: 1,
          availability: 1,
          interviewMode: 1,
          expectedSalary: 1,
          candidateBadges: 1,
          applicantSnapshot: 1,
          interviewModeAccepted: 1,

          jobId: "$jobDetails._id",
          jobTitle: "$jobDetails.title",
          jobType: "$jobDetails.jobType",
          jobWorkMode: "$jobDetails.workMode",
          jobDescription: "$jobDetails.description",
          jobSkillsRequired: "$jobDetails.skillsRequired",
          jobExperienceLevel: "$jobDetails.experienceLevel",

          profilePic: 1,
          applicantId: "$applicantDetails._id",
          applicantEmail: "$applicantDetails.email",
          applicantPhone: "$applicantDetails.mobile",
          applicantName: "$applicantDetails.fullName",
          applicantGender: "$applicantDetails.gender",
          applicantProfile: "$applicantDetails.profile",
        },
      },
      { $sort: { [sortBy]: sortOrder } },
      { $skip: skip },
      { $limit: limit },
    ];

    const result = await JobApplication.aggregate(pipeline);

    // Total count (with same match conditions)
    const totalCount = await JobApplication.aggregate([
      {
        $lookup: {
          from: "jobs",
          localField: "job",
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      { $unwind: "$jobDetails" },
      {
        $lookup: {
          from: "users",
          localField: "applicant",
          foreignField: "_id",
          as: "applicantDetails",
        },
      },
      { $unwind: "$applicantDetails" },
      { $match: matchConditions.length ? { $and: matchConditions } : {} },
      { $count: "count" },
    ]);

    const totalItems = totalCount[0]?.count || 0;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          result,
          pagination: {
            totalItems,
            currentPage: page,
            itemsPerPage: limit,
            totalPages: Math.ceil(totalItems / limit),
          },
        },
        "Applications received"
      )
    );
  } catch (err) {
    console.log("❌ Error in getReceivedApplications:", err);
    return res
      .status(404)
      .json(new ApiError(500, "Failed to fetch received applications"));
  }
};

export const getAllUserApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: user, role } = (req as any).user;
    const { userType } = req.params;

    let matchStage: any = {
      "postedDetails._id": { $exists: true, $ne: null },
      user: { $exists: true, $ne: null },
    };

    if (role === "employer" || role === "contractor") {
      matchStage.$expr = {
        $eq: ["$postedDetails._id", new mongoose.Types.ObjectId(user)],
      };
    }

    const pipeline: any[] = [
      {
        $lookup: {
          from: "users",
          localField: "applicant",
          foreignField: "_id",
          as: "applicantDetails",
        },
      },
      {
        $unwind: {
          path: "$applicantDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "job",
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      {
        $unwind: {
          path: "$jobDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "jobDetails.postedBy",
          foreignField: "_id",
          as: "postedDetails",
        },
      },
      {
        $unwind: {
          path: "$postedDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: matchStage },
    ];

    // Filter by role name if provided
    if (userType && userType !== "applications")
      pipeline.push({ $match: { "jobDetails.userType": userType } });

    pipeline.push({
      $project: {
        job: 1,
        status: 1,
        history: 1,
        resumeUrl: 1,
        createdAt: 1,
        updatedAt: 1,
        applicant: 1,
        coverLetter: 1,
        availability: 1,
        expectedSalary: 1,
        applicantSnapshot: 1,
        jobTitle: "$jobDetails.title",
        jobType: "$jobDetails.jobType",
        jobPosted: "$jobDetails.publishedAt",
        postedByEmail: "$postedDetails.email",
        postedByMobile: "$postedDetails.mobile",
        postedByName: "$postedDetails.fullName",
        applicantEmail: "$applicantDetails.email",
        postedByUserType: "$postedDetails.userType",
        applicantMobile: "$applicantDetails.mobile",
        applicantFullName: "$applicantDetails.fullName",
        applicantUserType: "$applicantDetails.userType",
      },
    });
    const apps = await JobApplicationService.getAll(req.query, pipeline);
    return res
      .status(200)
      .json(new ApiResponse(200, apps, "Applications fetched"));
  } catch (err) {
    next(err);
  }
};

export const getApplicationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const app = await JobApplication.findById(req.params.id);
    if (!app)
      return res.status(404).json(new ApiError(404, "Application not found"));
    return res
      .status(200)
      .json(new ApiResponse(200, app, "Application fetched"));
  } catch (err) {
    next(err);
  }
};

export const handleOfferAccepted = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const applicantId = (req as any).user.id;
    const app = await JobApplication.findById(req.params.id);
    if (!app) {
      return res
        .status(404)
        .json(new ApiError(404, "The specified application was not found."));
    }

    if (app.applicant.toString() !== applicantId) {
      return res
        .status(403)
        .json(
          new ApiError(403, "You are not authorized to perform this action.")
        );
    }

    if (app.status === ApplicationStatus.OFFERACCEPTED)
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "You have already accepted the job offer for this application."
          )
        );

    if (app.status !== ApplicationStatus.OFFERED) {
      return res
        .status(400)
        .json(new ApiError(400, "This application has not been offered yet."));
    }

    app.status = ApplicationStatus.OFFERACCEPTED;
    app.history.push({
      status: ApplicationStatus.OFFERACCEPTED,
      changedAt: new Date(),
    });
    await app.save();

    const [jobDoc, userDoc]: any = await Promise.all([
      Job.findById(app.job).select("status title postedBy"),
      User.findById(applicantId).select("fullName email mobile"),
    ]);

    const receiver = await User.findById(jobDoc?.postedBy).select(
      "_id userType"
    );
    if (jobDoc && receiver?._id) {
      await sendDualNotification({
        type: "application-status-update",
        context: {
          jobTitle: jobDoc?.title,
          userName: userDoc.fullName,
          status: ApplicationStatus.OFFERACCEPTED,
        },
        senderId: applicantId,
        senderRole: UserType.WORKER,
        receiverRole: receiver.userType,
        receiverId: receiver._id as any,
      });
    }
    if (app.job) await resetJobMetrics(app.job.toString());
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          app,
          "You have successfully accepted the job offer."
        )
      );
  } catch (err) {
    next(err);
  }
};

export const withdrawApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const app = await JobApplication.findById(req.params.id);
    if (!app) {
      return res
        .status(404)
        .json(new ApiError(404, "The requested application was not found."));
    }

    const applicantId = (req as any).user.id;
    if (app.applicant.toString() !== applicantId) {
      return res
        .status(403)
        .json(
          new ApiError(403, "You are not authorized to perform this action.")
        );
    }

    if (app.status === ApplicationStatus.WITHDRAWN) {
      return res
        .status(400)
        .json(
          new ApiError(400, "This application has already been withdrawn.")
        );
    }

    if (app.status === ApplicationStatus.HIRED) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "You cannot withdraw an application that has been hired."
          )
        );
    }

    if (
      app.status === ApplicationStatus.OFFERACCEPTED ||
      app.status === ApplicationStatus.OFFERDECLINED
    ) {
      const statusMessage =
        app.status === ApplicationStatus.OFFERACCEPTED
          ? "accepted"
          : "declined";

      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `You cannot withdraw an application that has already been offer ${statusMessage}.`
          )
        );
    }

    if (!app.job) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Associated job ID is missing from the application."
          )
        );
    }

    const job = await Job.findById(app.job);
    if (!job) {
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            "The job associated with this application no longer exists."
          )
        );
    }

    if (job.status !== JobStatus.OPEN) {
      return res
        .status(400)
        .json(
          new ApiError(400, "This job is no longer open for applications.")
        );
    }

    app.status = ApplicationStatus.WITHDRAWN;
    app.history.push({
      status: ApplicationStatus.WITHDRAWN,
      changedAt: new Date(),
    });

    await app.save();
    if (app.job) await resetJobMetrics(app.job.toString());

    const [jobDoc, userDoc]: any = await Promise.all([
      Job.findById(app.job).select("status title postedBy"),
      User.findById(applicantId).select("fullName email mobile"),
    ]);

    const receiver = await User.findById(jobDoc?.postedBy).select(
      "_id userType"
    );
    if (jobDoc && receiver?._id) {
      await sendDualNotification({
        type: "application-status-update",
        context: {
          jobTitle: jobDoc?.title,
          userName: userDoc.fullName,
          status: ApplicationStatus.WITHDRAWN,
        },
        senderId: applicantId,
        senderRole: UserType.WORKER,
        receiverRole: receiver.userType,
        receiverId: receiver._id as any,
      });
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          app,
          "Your application has been successfully withdrawn."
        )
      );
  } catch (err) {
    next(err);
  }
};

export const updateStatusByEmployer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const employerId = (req as any).user.id;
    const app = await JobApplication.findById(req.params.id);

    if (!app) {
      return res
        .status(404)
        .json(new ApiError(404, "The specified application was not found."));
    }

    const { status, interviewMode } = req.body;

    const job = await Job.findById(app.job);
    if (!job) {
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            "The job associated with this application could not be found."
          )
        );
    }

    if (job.status !== JobStatus.OPEN) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "The job is no longer open to accept application updates."
          )
        );
    }

    if (app.status === ApplicationStatus.OFFERACCEPTED) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "You cannot update the status of an application that has already been accepted."
          )
        );
    }

    if (job.postedBy.toString() !== employerId) {
      return res
        .status(403)
        .json(
          new ApiError(
            403,
            "You are not authorized to update this application."
          )
        );
    }

    if (!Object.values(ApplicationStatus).includes(status)) {
      return res
        .status(400)
        .json(new ApiError(400, "The provided status is invalid."));
    }

    app.status = status;
    if (status === ApplicationStatus.INTERVIEW) {
      if (!interviewMode || !["in-person", "online"].includes(interviewMode)) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Interview mode must be either 'in-person' or 'online'."
            )
          );
      }
      app.interviewMode = interviewMode;
    }
    app.history.push({
      status,
      changedAt: new Date(),
    });

    await app.save();

    const [jobDoc, userDoc]: any = await Promise.all([
      Job.findById(app.job).select("status title postedBy"),
      User.findById(employerId).select("fullName email mobile"),
    ]);

    const receiver = await User.findById(jobDoc?.postedBy).select(
      "_id userType"
    );
    if (jobDoc && receiver?._id) {
      await sendDualNotification({
        type: "application-status-update",
        context: {
          status: status,
          jobTitle: jobDoc?.title,
          userName: userDoc.fullName,
        },
        senderId: employerId,
        senderRole: UserType.EMPLOYER,
        receiverRole: receiver.userType,
        receiverId: receiver._id as any,
      });
    }
    if (app.job) await resetJobMetrics(app.job.toString());

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          app,
          "Application status has been updated successfully."
        )
      );
  } catch (err) {
    next(err);
  }
};

export const handleInterviewMode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const applicantId = (req as any).user.id;
    const app = await JobApplication.findById(req.params.id);

    if (!app) {
      return res
        .status(404)
        .json(new ApiError(404, "The specified application was not found."));
    }

    if (app.interviewModeAccepted) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "You have already accepted the interview mode for this application."
          )
        );
    }

    const { interviewMode, interviewModeAccepted, rescheduledDate } = req.body;
    const job = await Job.findById(app.job);
    if (!job) {
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            "The job associated with this application could not be found."
          )
        );
    }
    if (job.status !== JobStatus.OPEN) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "The job is no longer open to accept application updates."
          )
        );
    }

    if (applicantId !== app.applicant.toString()) {
      return res
        .status(403)
        .json(
          new ApiError(
            403,
            "You are not authorized to update this application."
          )
        );
    }
    if (interviewMode && !["in-person", "online"].includes(interviewMode)) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Interview mode must be either 'in-person' or 'online'."
          )
        );
    }
    app.availability = rescheduledDate ?? app.availability;
    app.interviewMode = interviewMode ?? app.interviewMode;
    app.interviewModeAccepted =
      interviewModeAccepted ?? app.interviewModeAccepted;

    await app.save();
    if (app.job) await resetJobMetrics(app.job.toString());

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          app,
          "Interview mode has been updated successfully."
        )
      );
  } catch (err) {
    next(err);
  }
};

export const checkJobApplicationEligibility = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    const eligibility = await getJobApplicationEligibility(userId);
    return res.status(200).json(
      new ApiResponse(200, eligibility, "Job application eligibility checked successfully")
    );
  } catch (err) {
    next(err);
  }
};

export const checkContractorJobApplicationEligibility = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    const eligibility = await getContractorJobApplicationEligibility(userId);
    return res.status(200).json(
      new ApiResponse(200, eligibility, "Contractor job application eligibility checked successfully")
    );
  } catch (err) {
    next(err);
  }
};
