import {
  ComplianceCalendarStatus,
  ComplianceStatus,
} from "../modals/compliancecalendarstatus.model";
import { ComplianceCalendar } from "../modals/compliancecalendar.model";
import { ComplianceCalendarReminder, ReminderStatus, ReminderType } from "../modals/compliancecalendarreminder.model";
import mongoose from "mongoose";

/**
 * Utility functions for Compliance Calendar business logic
 */

/**
 * Auto-create next period's compliance based on recurrence
 */
export async function createNextComplianceIfRecurring(
  calendar: any
): Promise<void> {
  if (calendar.recurrence === "NONE") return;

  const nextDate = new Date(calendar.eventDate);

  switch (calendar.recurrence) {
    case "MONTHLY":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "QUARTERLY":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "YEARLY":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case "DAILY":
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case "WEEKLY":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    default:
      return;
  }

  // Check if next period already exists
  const existingNext = await ComplianceCalendar.findOne({
    title: calendar.title,
    eventType: calendar.eventType,
    eventDate: {
      $gte: nextDate.setHours(0, 0, 0, 0),
      $lte: nextDate.setHours(23, 59, 59, 999),
    },
  });

  if (!existingNext) {
    // Create next period's compliance
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
  }
}

/**
 * Auto-mark compliance as MISSED if due date has passed and status is not PAID
 */
export async function checkAndMarkMissedCompliance(): Promise<number> {
  const now = new Date();
  const updated = await ComplianceCalendarStatus.updateMany(
    {
      complianceCalendarId: {
        $in: await ComplianceCalendar.find({
          eventDate: { $lt: now },
          isActive: true,
        }).select("_id"),
      },
      status: { $in: [ComplianceStatus.UPCOMING, ComplianceStatus.YET_TO_PAY] },
    },
    {
      status: ComplianceStatus.MISSED,
      updatedAt: new Date(),
    }
  );

  return updated.modifiedCount;
}

/**
 * Create reminders for a compliance status
 */
export async function createComplianceReminders(
  complianceCalendarStatusId: string,
  complianceCalendarId: string,
  employerId: string,
  dueDate: Date,
  channels: string[] = ["IN_APP"]
): Promise<any[]> {
  const reminderDates = [
    { type: ReminderType.BEFORE_7_DAYS, days: 7 },
    { type: ReminderType.BEFORE_1_DAY, days: 1 },
    { type: ReminderType.ON_DUE_DATE, days: 0 },
  ];

  const reminders = [];

  for (const reminder of reminderDates) {
    const scheduledDate = new Date(dueDate);
    scheduledDate.setDate(scheduledDate.getDate() - reminder.days);

    // Check if reminder already exists
    const exists = await ComplianceCalendarReminder.findOne({
      complianceCalendarStatusId,
      reminderType: reminder.type,
    });

    if (!exists) {
      const created = await ComplianceCalendarReminder.create({
        complianceCalendarStatusId,
        complianceCalendarId,
        employerId,
        reminderType: reminder.type,
        channels,
        status: ReminderStatus.PENDING,
        scheduledFor: scheduledDate,
        retryCount: 0,
      });
      reminders.push(created);
    }
  }

  return reminders;
}

/**
 * Bulk create compliance status for all employers for a new calendar
 */
export async function createStatusForAllEmployers(
  complianceCalendarId: string,
  employerIds: string[]
): Promise<number> {
  const statusRecords = employerIds.map((employerId) => ({
    complianceCalendarId: new mongoose.Types.ObjectId(complianceCalendarId),
    employerId: new mongoose.Types.ObjectId(employerId),
    status: ComplianceStatus.UPCOMING,
    createdBy: new mongoose.Types.ObjectId(employerId), // Admin ID would be better
    updatedBy: new mongoose.Types.ObjectId(employerId),
  }));

  const result = await ComplianceCalendarStatus.insertMany(statusRecords);
  return result.length;
}

/**
 * Get compliance analytics for admin dashboard
 */
export async function getComplianceAnalytics(): Promise<any> {
  const totalCompliances = await ComplianceCalendar.countDocuments({
    isActive: true,
  });

  const statusCounts = await ComplianceCalendarStatus.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const statusMap: any = {
    [ComplianceStatus.UPCOMING]: 0,
    [ComplianceStatus.YET_TO_PAY]: 0,
    [ComplianceStatus.PAID]: 0,
    [ComplianceStatus.MISSED]: 0,
  };

  statusCounts.forEach((item: any) => {
    statusMap[item._id] = item.count;
  });

  const overallComplianceRate = totalCompliances > 0
    ? Math.round((statusMap[ComplianceStatus.PAID] / totalCompliances) * 100)
    : 0;

  return {
    totalCompliances,
    statusBreakdown: statusMap,
    overallComplianceRate,
    pendingActions: statusMap[ComplianceStatus.YET_TO_PAY],
    missedCompliances: statusMap[ComplianceStatus.MISSED],
  };
}

/**
 * Get employer-specific compliance analytics
 */
export async function getEmployerComplianceAnalytics(
  employerId: string
): Promise<any> {
  const userId = new mongoose.Types.ObjectId(employerId);

  const totalAssigned = await ComplianceCalendarStatus.countDocuments({
    employerId: userId,
  });

  const statusCounts = await ComplianceCalendarStatus.aggregate([
    { $match: { employerId: userId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const statusMap: any = {
    [ComplianceStatus.UPCOMING]: 0,
    [ComplianceStatus.YET_TO_PAY]: 0,
    [ComplianceStatus.PAID]: 0,
    [ComplianceStatus.MISSED]: 0,
  };

  statusCounts.forEach((item: any) => {
    statusMap[item._id] = item.count;
  });

  const complianceRate = totalAssigned > 0
    ? Math.round(
        ((statusMap[ComplianceStatus.PAID] +
          statusMap[ComplianceStatus.UPCOMING]) /
          totalAssigned) *
          100
      )
    : 0;

  // Get upcoming deadlines (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcomingDeadlines = await ComplianceCalendarStatus.find({
    employerId: userId,
    status: { $in: [ComplianceStatus.UPCOMING, ComplianceStatus.YET_TO_PAY] },
  })
    .populate({
      path: "complianceCalendarId",
      match: { eventDate: { $lte: thirtyDaysFromNow } },
    })
    .lean();

  return {
    totalAssigned,
    statusBreakdown: statusMap,
    complianceRate,
    upcomingDeadlines: upcomingDeadlines.filter(
      (c: any) => c.complianceCalendarId
    ),
    overdue: statusMap[ComplianceStatus.MISSED],
  };
}

/**
 * Archive old compliance records (soft delete)
 */
export async function archiveOldCompliances(
  daysOld: number = 365
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await ComplianceCalendar.updateMany(
    {
      eventDate: { $lt: cutoffDate },
      isActive: true,
    },
    { isActive: false }
  );

  return result.modifiedCount;
}

/**
 * Generate compliance report for audit
 */
export async function generateComplianceReport(
  employerId: string,
  startDate: Date,
  endDate: Date
): Promise<any> {
  const userId = new mongoose.Types.ObjectId(employerId);

  const records = await ComplianceCalendarStatus.find({
    employerId: userId,
    updatedAt: { $gte: startDate, $lte: endDate },
  })
    .populate("complianceCalendarId")
    .lean();

  const report = {
    employerId,
    periodFrom: startDate,
    periodTo: endDate,
    totalRecords: records.length,
    paid: records.filter((r: any) => r.status === ComplianceStatus.PAID).length,
    pending: records.filter(
      (r: any) => r.status === ComplianceStatus.YET_TO_PAY
    ).length,
    missed: records.filter((r: any) => r.status === ComplianceStatus.MISSED)
      .length,
    upcoming: records.filter((r: any) => r.status === ComplianceStatus.UPCOMING)
      .length,
    records,
  };

  return report;
}
