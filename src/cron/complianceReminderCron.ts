import cron from "node-cron";
import colors from "colors";
import { ComplianceCalendarReminder, ReminderStatus, ReminderChannel } from "../modals/compliancecalendarreminder.model";
import { ComplianceCalendar } from "../modals/compliancecalendar.model";
import { logger } from "../config/logger";
import { sendNotification } from "../utils/notificationUtil";

const jobTitle = "[COMPLIANCE REMINDER CRON JOB]";

/**
 * Run every hour to check and send pending reminders
 * Cron: "0 * * * *" = At minute 0 of every hour
 */
cron.schedule("0 * * * *", async () => {
  try {
    console.log(colors.cyan(`${jobTitle} Starting reminder check...`));

    // Find all pending reminders that should be sent
    const now = new Date();
    const pendingReminders = await ComplianceCalendarReminder.find({
      status: ReminderStatus.PENDING,
      scheduledFor: { $lte: now },
    })
      .populate("complianceCalendarId")
      .limit(100) // Process in batches
      .lean();

    console.log(
      colors.yellow(
        `${jobTitle} Found ${pendingReminders.length} pending reminders to send`
      )
    );

    if (pendingReminders.length === 0) {
      console.log(colors.green(`${jobTitle} No pending reminders to send`));
      return;
    }

    // Process each reminder
    for (const reminder of pendingReminders) {
      try {
        const calendar = reminder.complianceCalendarId as any;

        // Prepare notification data
        const notificationData = {
          userId: reminder.employerId.toString(),
          type: "COMPLIANCE_REMINDER",
          title: `${calendar.title} Reminder`,
          message: getReminderMessage(reminder.reminderType, calendar.eventDate),
          data: {
            complianceCalendarId: reminder.complianceCalendarId.toString(),
            reminderType: reminder.reminderType,
          },
        };

        // Send through configured channels
        const results: any = {
          in_app: false,
          whatsapp: false,
          email: false,
        };

        // IN_APP notification
        if (reminder.channels.includes(ReminderChannel.IN_APP)) {
          try {
            // Create in-app notification (using your existing system)
            await sendNotification({
              ...notificationData,
              channel: "IN_APP",
            });
            results.in_app = true;
          } catch (err) {
            console.error(
              colors.red(
                `${jobTitle} Failed to send IN_APP notification: ${err}`
              )
            );
          }
        }

        // WHATSAPP notification
        if (reminder.channels.includes(ReminderChannel.WHATSAPP)) {
          try {
            // Send WhatsApp notification (integrate with your WhatsApp service)
            await sendNotification({
              ...notificationData,
              channel: "WHATSAPP",
            });
            results.whatsapp = true;
          } catch (err) {
            console.error(
              colors.red(
                `${jobTitle} Failed to send WhatsApp notification: ${err}`
              )
            );
          }
        }

        // EMAIL notification
        if (reminder.channels.includes(ReminderChannel.EMAIL)) {
          try {
            // Send Email notification (integrate with your email service)
            await sendNotification({
              ...notificationData,
              channel: "EMAIL",
            });
            results.email = true;
          } catch (err) {
            console.error(
              colors.red(`${jobTitle} Failed to send EMAIL notification: ${err}`)
            );
          }
        }

        // Update reminder status
        const successfulChannels = Object.values(results).filter(
          (v) => v === true
        );

        if (successfulChannels.length > 0) {
          await ComplianceCalendarReminder.updateOne(
            { _id: reminder._id },
            {
              status: ReminderStatus.SENT,
              sentAt: new Date(),
              retryCount: 0,
            }
          );

          console.log(
            colors.green(
              `${jobTitle} Successfully sent reminder for ${calendar.title}`
            )
          );
        } else {
          // All channels failed - increment retry count
          const updatedReminder = await ComplianceCalendarReminder.findOne({
            _id: reminder._id,
          });

          if (
            updatedReminder &&
            updatedReminder.retryCount < 3
          ) {
            await ComplianceCalendarReminder.updateOne(
              { _id: reminder._id },
              {
                retryCount: updatedReminder.retryCount + 1,
                // Reschedule for 1 hour later
                scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
              }
            );
          } else {
            // Max retries exceeded
            await ComplianceCalendarReminder.updateOne(
              { _id: reminder._id },
              {
                status: ReminderStatus.FAILED,
                failureReason: "Max retry attempts exceeded",
              }
            );
          }
        }
      } catch (err) {
        console.error(
          colors.red(`${jobTitle} Error processing reminder: ${err}`)
        );
      }
    }

    console.log(colors.green(`${jobTitle} Reminder check completed`));
  } catch (err) {
    console.error(colors.red(`${jobTitle} Cron job error: ${err}`));
    logger.error(`Compliance reminder cron job failed: ${err}`);
  }
});

/**
 * Helper function to generate reminder message
 */
function getReminderMessage(
  reminderType: string,
  eventDate: Date
): string {
  const date = new Date(eventDate);
  const formattedDate = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  switch (reminderType) {
    case "BEFORE_7_DAYS":
      return `Compliance due in 7 days on ${formattedDate}. Please ensure timely payment.`;
    case "BEFORE_1_DAY":
      return `Compliance payment due tomorrow on ${formattedDate}. Please complete immediately.`;
    case "ON_DUE_DATE":
      return `Compliance is due today (${formattedDate}). Please pay immediately to avoid penalties.`;
    default:
      return `Compliance reminder for ${formattedDate}`;
  }
}

console.log(
  colors.green(`${jobTitle} Compliance reminder cron job initialized`)
);
