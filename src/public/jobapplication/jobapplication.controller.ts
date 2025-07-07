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

const JobApplicationService = new CommonService(JobApplication);

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
      User.findById(applicantId).select("fullName email mobile"),
    ]);

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
        type: "job-applied",
        context: {
          jobTitle: jobDoc?.title,
          applicantName: "Rishabh",
        },
        senderId: applicantId,
        senderRole: UserType.WORKER,
        receiverId: receiver._id,
        receiverRole: receiver.userType,
      });

    // await sendSingleNotification({
    //   type: "job-expiring",
    //   context: {
    //     jobTitle: "Electrician Opening",
    //     expiryDate: "2025-07-08",
    //   },
    //   toUserId: "664baaa7d9ff1bca3a7f112a",
    //   toRole: "worker",
    //   fromUser: {
    //     id: "664bbcc97b7aa1bcddaa1100",
    //     role: "employer",
    //   },
    //   direction: "receiver",
    // });

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
      return res.status(400).json(new ApiError(400, "Invalid or missing user ID."));
    }

    if (![UserType.EMPLOYER, UserType.CONTRACTOR].includes(role)) {
      return res.status(404).json(new ApiError(403, "Unauthorized access."));
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const sortBy: any = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const statusFilter = req.query.status as string;
    const search = (req.query.search as string)?.trim();

    const matchConditions: any = [];

    // Match only jobs posted by current user
    matchConditions.push({ "jobDetails.postedBy": new mongoose.Types.ObjectId(userId) });
    if (statusFilter) matchConditions.push({ status: statusFilter });

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
          applicantSnapshot: 1,
          interviewModeAccepted: 1,
          jobId: "$jobDetails._id",
          jobTitle: "$jobDetails.title",
          jobType: "$jobDetails.jobType",
          jobWorkMode: "$jobDetails.workMode",
          jobDescription: "$jobDetails.description",
          jobSkillsRequired: "$jobDetails.skillsRequired",
          jobExperienceLevel: "$jobDetails.experienceLevel",
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
    return res.status(404).json(new ApiError(500, "Failed to fetch received applications"));
  }
};

export const getAllUserApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pipeline = {
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
      },
    };
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