import cron from "node-cron";
import colors from "colors";
import { subDays } from "date-fns";
import { Slot } from "../modals/slot.model";

// Run every Monday at midnight (00:00)
cron.schedule("0 0 * * 1", async () => {
    const jobTitle = "[SLOT CLEANUP JOB]";
    try {
        console.log(colors.blue(`${jobTitle} Starting slot cleanup...`));

        const oneDayAgo = subDays(new Date(), 1);

        const deleteResult = await Slot.updateMany(
            {
                "timeslots.date": { $lte: oneDayAgo },
                "timeslots.isBooked": false,
            },
            {
                $pull: {
                    timeslots: {
                        date: { $lte: oneDayAgo },
                        isBooked: false,
                    },
                },
            }
        );

        if (deleteResult.modifiedCount > 0) {
            const updatedSlots = await Slot.aggregate([
                {
                    $match: {
                        "timeslots.date": { $lte: oneDayAgo },
                        "timeslots.isBooked": false,
                    },
                },
                {
                    $group: {
                        _id: "$user",
                        deletedCount: { $sum: 1 },
                    },
                },
            ]);

            if (updatedSlots.length > 0) {
                updatedSlots.forEach((slot) => {
                    console.log(
                        colors.green(
                            `${jobTitle} Assistant ID: ${slot._id} had ${slot.deletedCount} unbooked slots older than a day deleted.`
                        )
                    );
                });
            } else {
                console.log(colors.yellow(`${jobTitle} No unbooked slots found.`));
            }
        } else {
            console.log(
                colors.yellow(
                    `${jobTitle} No unbooked slots older than a day were found.`
                )
            );
        }
    } catch (error) {
        console.error(
            colors.red(`${jobTitle} Error during slot cleanup: ${(error as Error).message}`)
        );
    }
});
