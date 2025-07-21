import cron from "node-cron";
import colors from "colors";
import { Job } from "../modals/job.model";
import { resetJobMetrics } from "../public/jobapplication/jobapplication.controller";

let isRunning = false;

cron.schedule("0 0 * * *", async () => {
    if (isRunning) {
        console.log(colors.yellow("⏳ Previous job stats cron still running. Skipping this cycle."));
        return;
    }

    isRunning = true;
    console.log(colors.blue(`🌙 Midnight job stats cron started at ${new Date().toLocaleString()}`));

    try {
        const jobs = await Job.find({ status: "open" }, "_id").lean();
        if (jobs.length === 0) {
            console.log(colors.yellow("⚠️ No jobs found to update."));
            return;
        }

        for (const { _id } of jobs) {
            try {
                await resetJobMetrics(_id.toString());
                console.log(colors.green(`✅ Reset metrics for job: ${_id}`));
            } catch (err: any) {
                console.log(colors.red(`❌ Failed to reset metrics for job ${_id}: ${err.message}`));
            }
        }

        console.log(colors.green(`🎯 Job stats reset completed for ${jobs.length} jobs.`));
    } catch (err: any) {
        console.log(colors.red(`🚨 Job stats cron failed: ${err.message}`));
    } finally {
        isRunning = false;
    }
});
