import cron from "node-cron";
import colors from "colors";
import { Community } from "../modals/community.model";
import { resetStats } from "../public/communitymember/communitymember.controller";

let isRunning = false;

cron.schedule("0 0 * * *", async () => {
    if (isRunning) {
        console.log(colors.yellow("⏳ Previous community stats job still running. Skipping this cycle."));
        return;
    }

    isRunning = true;
    console.log(colors.blue(`🌙 Midnight cron job started at ${new Date().toLocaleString()}`));

    try {
        const communities = await Community.find({}, "_id").lean();
        if (communities.length === 0) {
            console.log(colors.yellow("⚠️ No communities found to update."));
            return;
        }
        for (const { _id } of communities) {
            try {
                await resetStats(_id.toString());
                console.log(colors.green(`✅ Updated stats for community: ${_id}`));
            } catch (err: any) {
                console.log(colors.red(`❌ Failed to update stats for community ${_id}: ${err.message}`));
            }
        }
        console.log(colors.green(`🎉 Community stats update completed for ${communities.length} communities.`));
    } catch (err: any) {
        console.log(colors.red(`🚨 Cron job failed: ${err.message}`));
    } finally {
        isRunning = false;
    }
});
