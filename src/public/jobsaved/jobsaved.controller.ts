import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { JobSave } from "../../modals/jobsaved.model";
import { Request, Response, NextFunction } from "express";

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

      const saved = await JobSave.create({ user, job });
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
};
