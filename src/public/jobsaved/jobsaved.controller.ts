import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import { Job } from "../../modals/job.model";
import ApiResponse from "../../utils/ApiResponse";
import { JobSave } from "../../modals/jobsaved.model";
import { Request, Response, NextFunction } from "express";
import { CommonService } from "../../services/common.services";

const jobSavedService = new CommonService(JobSave);

export const getRecommendedJobsByTags = async (userId: string, limit = 10) => {
  const savedJobs = await JobSave.find(
    { user: userId },
    { _id: 1, tags: 1, job: 1 }
  );
  const tagFrequency: Record<string, number> = {};
  for (const entry of savedJobs) {
    const jobTags = entry.tags || [];
    jobTags.forEach((tag: string) => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });
  }
  const sortedTags = Object.entries(tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const recommendedJobs = await Job.find({
    tags: { $in: sortedTags },
    _id: { $nin: savedJobs.map((j) => j.job) }, // Exclude already saved
    status: "open",
  })
    .limit(limit)
    .lean();
  return recommendedJobs;
};

export const JobSaveController = {
  async saveJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: job } = req.params;
      const user = (req as any).user.id;

      const alreadySaved = await JobSave.findOne({ user, job });
      if (alreadySaved)
        return res
          .status(200)
          .json(new ApiResponse(200, alreadySaved, "Job already saved"));

      const jobExists = await Job.findById(job);
      if (!jobExists)
        return res.status(404).json(new ApiError(404, "Job not found"));

      const saved = await JobSave.create({ user, job, tags: jobExists.tags });
      return res
        .status(201)
        .json(new ApiResponse(201, saved, "Job saved successfully"));
    } catch (err) {
      next(err);
    }
  },

  async getAllSavedJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user, role } = (req as any).user;

      let matchStage: any = {
        "postedByUserDetails._id": { $exists: true, $ne: null },
        user: { $exists: true, $ne: null },
      };

      if (role === "employer" || role === "contractor") {
        matchStage.$expr = {
          $eq: ["$postedByUserDetails._id", new mongoose.Types.ObjectId(user)],
        };
      }

      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$user" },
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
            as: "userByProfile",
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
        { $unwind: "$jobDetails" },
        {
          $lookup: {
            from: "users",
            localField: "jobDetails.postedBy",
            foreignField: "_id",
            as: "postedByUserDetails",
          },
        },
        { $unwind: "$postedByUserDetails" },
        { $match: matchStage },
        {
          $project: {
            _id: 1,
            tags: 1,
            createdAt: 1,
            updatedAt: 1,
            "jobDetails.title": 1,
            "jobDetails.status": 1,
            "userDetails.email": 1,
            "jobDetails.jobType": 1,
            "userDetails.mobile": 1,
            "jobDetails.workMode": 1,
            "userDetails.fullName": 1,
            "postedByUserDetails.email": 1,
            "jobDetails.experienceLevel": 1,
            "postedByUserDetails.mobile": 1,
            "postedByUserDetails.fullName": 1,
            "userByProfile": { $arrayElemAt: ["$userByProfile.url", 0] },
          },
        },
      ];
      const result = await jobSavedService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  },

  async unsaveJob(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user.id;
      const { jobId } = req.params;

      const result = await JobSave.findOneAndDelete({ user, job: jobId });
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Job not found in saved list"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Job removed from saved list"));
    } catch (err) {
      next(err);
    }
  },

  async getSavedJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user.id;
      const jobs = await JobSave.find({ user }).populate("job");
      return res
        .status(200)
        .json(new ApiResponse(200, jobs, "Saved jobs fetched"));
    } catch (err) {
      next(err);
    }
  },

  async getJobRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const jobs = await getRecommendedJobsByTags(userId);
      return res
        .status(200)
        .json(new ApiResponse(200, jobs, "Recommended jobs fetched"));
    } catch (err) {
      next(err);
    }
  },
};
