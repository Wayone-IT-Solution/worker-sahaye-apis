import cron from "node-cron";
import colors from "colors";
import {
  ComplianceCalendarStatus,
  ComplianceStatus,
} from "../modals/compliancecalendarstatus.model";
import { ComplianceCalendar } from "../modals/compliancecalendar.model";
import { logger } from "../config/logger";

const jobTitle = "[COMPLIANCE STATUS UPDATE CRON JOB]";

/**
 * Run daily at midnight to auto-mark missed compliances
 * Cron: "0 0 * * *" = At 00:00 every day
 */
cron.schedule("0 0 * * *", async () => {
  try {
    console.log(colors.cyan(`${jobTitle} Starting compliance status update...`));

    const now = new Date();

    // Find all compliances that were due but not paid
    const dueDates = await ComplianceCalendar.find(
      {
        eventDate: { $lt: now },
        isActive: true,
      },
      { _id: 1 }
    );

    if (dueDates.length === 0) {
      console.log(colors.green(`${jobTitle} No overdue compliances found`));
      return;
    }

    const dueCalendarIds = dueDates.map((c) => c._id);

    // Mark as MISSED if status is UPCOMING or YET_TO_PAY
    const result = await ComplianceCalendarStatus.updateMany(
      {
        complianceCalendarId: { $in: dueCalendarIds },
        status: {
          $in: [ComplianceStatus.UPCOMING, ComplianceStatus.YET_TO_PAY],
        },
      },
      {
        $set: {
          status: ComplianceStatus.MISSED,
          updatedAt: new Date(),
          updatedBy: new (require("mongoose").Types.ObjectId)(),
        },
      }
    );

    console.log(
      colors.green(
        `${jobTitle} Marked ${result.modifiedCount} compliances as MISSED`
      )
    );
  } catch (err) {
    console.error(colors.red(`${jobTitle} Cron job error: ${err}`));
    logger.error(`Compliance status update cron job failed: ${err}`);
  }
});

/**
 * Run weekly on Sundays to auto-create next period compliances
 * Cron: "0 3 * * 0" = At 03:00 on Sunday
 */
cron.schedule("0 3 * * 0", async () => {
  try {
    console.log(
      colors.cyan(
        `${jobTitle} Starting recurring compliance creation...`
      )
    );

    const recurringCompliances = await ComplianceCalendar.find({
      recurrence: { $in: ["MONTHLY", "QUARTERLY", "YEARLY", "DAILY", "WEEKLY"] },
      isActive: true,
    });

    if (recurringCompliances.length === 0) {
      console.log(colors.green(`${jobTitle} No recurring compliances found`));
      return;
    }

    let createdCount = 0;

    for (const calendar of recurringCompliances) {
      const nextDate = calculateNextDate(calendar.eventDate, calendar.recurrence);

      // Check if next period already exists
      const existingNext = await ComplianceCalendar.findOne({
        title: calendar.title,
        eventType: calendar.eventType,
        eventDate: {
          $gte: new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()),
          $lt: new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate() + 1),
        },
      });

      if (!existingNext) {
        await ComplianceCalendar.create({
          title: calendar.title,
          notes: calendar.notes,
          eventType: calendar.eventType,
          customLabel: calendar.customLabel,
          eventDate: nextDate,
          recurrence: calendar.recurrence,
          document: calendar.document,
          tags: calendar.tags,
          isActive: true,
        });
        createdCount++;
      }
    }

    console.log(
      colors.green(
        `${jobTitle} Created ${createdCount} new recurring compliance periods`
      )
    );
  } catch (err) {
    console.error(colors.red(`${jobTitle} Cron job error: ${err}`));
    logger.error(`Recurring compliance creation cron job failed: ${err}`);
  }
});

/**
 * Helper function to calculate next date based on recurrence pattern
 */
function calculateNextDate(eventDate: Date, recurrence: string): Date {
  const nextDate = new Date(eventDate);

  switch (recurrence) {
    case "DAILY":
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case "WEEKLY":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "MONTHLY":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "QUARTERLY":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "YEARLY":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      return eventDate;
  }

  return nextDate;
}

console.log(
  colors.green(`${jobTitle} Compliance status update cron job initialized`)
);
