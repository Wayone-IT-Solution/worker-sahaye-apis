import "colors";
import cron from "node-cron";
import { subMinutes } from "date-fns";
import { Booking } from "../modals/booking.model";
import { Slot } from "../modals/slot.model";

// Cron job runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
    const currentTime = new Date().toISOString();
    console.log(
        `[Cron Job Started] Checking unprocessed slots. Time: ${currentTime}`.blue
    );

    try {
        const fiveMinutesAgo = subMinutes(new Date(currentTime), 5);
        const tenMinutesAgo = subMinutes(new Date(currentTime), 10);

        const transactions = await Booking.find({
            payment_status: { $ne: "successful" },
            createdAt: { $gte: tenMinutesAgo, $lte: fiveMinutesAgo },
        });

        let updatedCount = 0;

        if (transactions.length > 0) {
            console.log(
                `[TRANSACTION JOB] Found ${transactions.length} transaction(s) to check.`.yellow
            );

            for (const transaction of transactions) {
                try {
                    const slot = await Slot.findOne({
                        "timeslots._id": transaction.timeslotId,
                        "timeslots.isBooked": true,
                    });

                    if (slot) {
                        const timeslot: any = slot.timeslots.find((slot: any) => slot?._id.toString() === transaction.timeslotId.toString());
                        if (timeslot && timeslot.isBooked) {
                            timeslot.isBooked = false;
                            timeslot.bookedBy = null;
                            await slot.save();
                            updatedCount++;

                            console.log(
                                `[TRANSACTION JOB] Slot ${transaction.timeslotId} marked as available.`.green
                            );
                        }
                    } else {
                        console.log(
                            `[TRANSACTION JOB] Slot not found or already unbooked for transaction ${transaction._id}.`.red
                        );
                    }
                } catch (slotError) {
                    console.error(
                        `[ERROR] [TRANSACTION JOB] While processing transaction ${transaction._id}:`.red,
                        slotError
                    );
                }
            }
        } else {
            console.log(
                `[TRANSACTION JOB] No transactions found that meet the criteria.`.gray
            );
        }

        console.log(
            `[TRANSACTION JOB] Total slots updated: ${updatedCount}`.blue
        );
    } catch (error) {
        console.error(`[ERROR] [TRANSACTION JOB] Cron execution failed:`.red, error);
    } finally {
        console.log(
            `[TRANSACTION JOB Ended] Time: ${new Date().toISOString()}`.blue
        );
    }
});
