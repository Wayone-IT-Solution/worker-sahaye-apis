import { User } from "../modals/user.model";
import { JobApplication } from "../modals/jobapplication.model";
import { Job } from "../modals/job.model";
import mongoose from "mongoose";
import {
  calculateFastResponderScore,
  calculateProfileCompletionPoints,
  calculateApplicationSpeedPoints,
  calculateApplicationRatePoints,
} from "../modals/user.model";

/**
 * Calculate and update Fast Responder score for a user
 * @param userId User ID
 * @returns Updated user with new fastResponder score
 */
export const updateFastResponderScore = async (userId: string | mongoose.Types.ObjectId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    // 1. Calculate Profile Completion Points (0-30)
    const profilePoints = calculateProfileCompletionPoints(user);

    // 2. Calculate Job Application Speed Points (0-40)
    // Get average response time from recent job applications (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentApplications = await JobApplication.find({
      applicant: userId,
      createdAt: { $gte: thirtyDaysAgo },
    }).populate("job");

    let totalSpeedPoints = 0;
    let validApplications = 0;

    for (const app of recentApplications) {
      const job = app.populate("job") as any;
      if (job?.job?.createdAt) {
        const jobCreatedAt = new Date(job.job.createdAt).getTime();
        const appCreatedAt = new Date(app.get("createdAt")).getTime();
        const hoursDifference = (appCreatedAt - jobCreatedAt) / (1000 * 60 * 60);
        
        const speedPoints = calculateApplicationSpeedPoints(hoursDifference);
        totalSpeedPoints += speedPoints;
        validApplications++;
      }
    }

    const avgSpeedPoints = validApplications > 0 ? Math.round(totalSpeedPoints / validApplications) : 0;

    // 3. Calculate Job Application Rate Points (0-30)
    // Based on user's preferred job categories in last 30 days
    const preferredCategories = user.preferredJobCategories || [];
    
    if (preferredCategories.length > 0) {
      // Get total jobs in preferred categories created in last 30 days
      const totalPreferredJobs = await Job.countDocuments({
        category: { $in: preferredCategories },
        createdAt: { $gte: thirtyDaysAgo },
        status: "open",
      });

      // Get applications on preferred category jobs by this user in last 30 days
      const appliedToPreferred = await JobApplication.countDocuments({
        applicant: userId,
        createdAt: { $gte: thirtyDaysAgo },
      }).lean();

      // Get applications to preferred jobs (need to check job category)
      const applicationsToPreferredJobs = await JobApplication.aggregate([
        {
          $match: {
            applicant: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $lookup: {
            from: "jobs",
            localField: "job",
            foreignField: "_id",
            as: "jobData",
          },
        },
        {
          $match: {
            "jobData.category": { $in: preferredCategories },
          },
        },
        {
          $count: "total",
        },
      ]);

      const applicationsOnPreferred = applicationsToPreferredJobs[0]?.total || 0;
      const ratePercentage = totalPreferredJobs > 0 ? (applicationsOnPreferred / totalPreferredJobs) * 100 : 0;
      const ratePoints = calculateApplicationRatePoints(ratePercentage);

      // Calculate final Fast Responder Score
      const fastResponderScore = calculateFastResponderScore(profilePoints, avgSpeedPoints, ratePoints);

      // Update user with new score
      user.fastResponder = fastResponderScore;
      await user.save();

      return user;
    } else {
      // No preferred categories, use 0 for rate points
      const fastResponderScore = calculateFastResponderScore(profilePoints, avgSpeedPoints, 0);
      user.fastResponder = fastResponderScore;
      await user.save();
      return user;
    }
  } catch (error) {
    console.error("Error updating fast responder score:", error);
    throw error;
  }
};

/**
 * Batch update Fast Responder scores for all workers
 * Useful for running as a cron job
 */
export const batchUpdateFastResponderScores = async () => {
  try {
    const workers = await User.find({ userType: "worker" });
    console.log(`Updating fast responder scores for ${workers.length} workers...`);

    for (const worker of workers) {
      await updateFastResponderScore(worker._id);
    }

    console.log("Batch update completed");
  } catch (error) {
    console.error("Error in batch update:", error);
    throw error;
  }
};
