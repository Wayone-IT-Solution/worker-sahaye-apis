import ApiError from "../../utils/ApiError";
import { Job } from "../../modals/job.model";
import ApiResponse from "../../utils/ApiResponse";
import { JobSave } from "../../modals/jobsaved.model";
import { Request, Response, NextFunction } from "express";

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
