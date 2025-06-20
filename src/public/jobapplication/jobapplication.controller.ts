import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Job, JobStatus } from "../../modals/job.model";
import { Request, Response, NextFunction } from "express";
import {
  JobApplication,
  ApplicationStatus,
} from "../../modals/jobapplication.model";
import User from "../../modals/user.model";
import { CommonService } from "../../services/common.services";

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
      Job.findById(job).select("status"),
      User.findById(applicantId).select("fullName email mobile"),
    ]);

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
    const applicantId = (req as any).user.id;
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
    const apps = await JobApplicationService.getAll(
      {
        ...req.query,
        applicantId,
      },
      pipeline
    );
    return res
      .status(200)
      .json(new ApiResponse(200, apps, "Applications fetched"));
  } catch (err) {
    next(err);
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
