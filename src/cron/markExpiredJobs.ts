import colors from "colors";
import cron from "node-cron";
import { subDays } from "date-fns";
import { Job } from "../modals/job.model";

let isRunning = false;

cron.schedule("0 0 * * *", async () => {
    if (isRunning) {
        console.log(colors.yellow("⏳ Previous expiration cron still running. Skipping this cycle."));
        return;
    }
    isRunning = true;
    console.log(colors.blue(`📅 Job expiration cron started at ${new Date().toLocaleString()}`));
    try {
        const expirationDate = subDays(new Date(), 30);
        const result = await Job.updateMany(
            { status: "open", createdAt: { $lt: expirationDate } },
            { $set: { status: "expired", expiresAt: new Date() } }
        );
        console.log(colors.green(`✅ Marked ${result.modifiedCount} job(s) as expired.`));
    } catch (err: any) {
        console.log(colors.red(`🚨 Job expiration cron failed: ${err.message}`));
    } finally {
        isRunning = false;
    }
});
