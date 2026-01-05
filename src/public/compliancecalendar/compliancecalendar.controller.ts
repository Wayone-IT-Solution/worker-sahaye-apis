import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { ComplianceCalendar } from "../../modals/compliancecalendar.model";
import {
  ComplianceCalendarStatus,
  ComplianceStatus,
} from "../../modals/compliancecalendarstatus.model";
import { ComplianceCalendarReminder } from "../../modals/compliancecalendarreminder.model";
import { deleteFromS3 } from "../../config/s3Uploader";

const complianceCalendarService = new CommonService(ComplianceCalendar);
const complianceStatusService = new CommonService(ComplianceCalendarStatus);
const reminderService = new CommonService(ComplianceCalendarReminder);

export class PublicComplianceCalendarController {
  /**
   * GET /api/compliancecalendar/public
   * Get all compliance calendars for employer
   */
  static async getComplianceCalendars(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: employerId } = (req as any).user;
      const { eventType, status } = req.query;

      // Use CommonService to get calendars WITH pagination
      const calendarsResult = await complianceCalendarService.getAll({
        isActive: true,
        ...(eventType && { eventType }),
        ...req.query, // Pass all query params including page, limit
      });

      // Extract result and pagination from CommonService response
      const calendars = Array.isArray(calendarsResult) ? calendarsResult : (calendarsResult.result || []);
      const paginationInfo = !Array.isArray(calendarsResult) ? calendarsResult.pagination : null;

      // Get status and reminders for each calendar
      const enrichedCalendars = await Promise.all(
        calendars.map(async (calendar: any) => {
          const statusRecord = await ComplianceCalendarStatus.findOne({
            complianceCalendarId: new mongoose.Types.ObjectId(calendar._id),
            employerId: new mongoose.Types.ObjectId(employerId),
          }).lean();

          // Get reminders to check if active
          const reminders = await ComplianceCalendarReminder.find({
            complianceCalendarId: new mongoose.Types.ObjectId(calendar._id),
            employerId: new mongoose.Types.ObjectId(employerId),
          }).select("channels status").lean();

          // Extract active channels (flatten array of arrays)
          const activeChannels = reminders.length > 0 
            ? [...new Set(reminders.flatMap((r: any) => r.channels || []))]
            : [];

          return {
            ...calendar,
            employerStatus: statusRecord || {
              status: ComplianceStatus.UPCOMING,
              datePaid: null,
            },
            isReminderActive: reminders.length > 0,
            activeChannels: activeChannels,
          };
        })
      );

      // Filter by status if provided
      let result = enrichedCalendars;
      if (status) {
        result = enrichedCalendars.filter(
          (c: any) => c.employerStatus.status === status
        );
      }

      // Return with pagination structure if available
      const response = paginationInfo ? {
        result,
        pagination: paginationInfo,
      } : result;

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            response,
            "Compliance calendars fetched successfully"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/compliancecalendar/public/:id
   * Get single compliance calendar details with reminders
   */
  static async getComplianceCalendarDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: employerId } = (req as any).user;
      const { id: calendarId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(calendarId)) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid compliance calendar ID"));
      }

      const calendar = await ComplianceCalendar.findById(calendarId).lean();
      if (!calendar) {
        return res
          .status(404)
          .json(new ApiError(404, "Compliance calendar not found"));
      }

      const statusRecord = await ComplianceCalendarStatus.findOne({
        complianceCalendarId: calendarId,
        employerId,
      }).lean();

      const reminders = await ComplianceCalendarReminder.find({
        complianceCalendarId: calendarId,
        employerId,
      })
        .sort({ scheduledFor: 1 })
        .lean();

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            calendar,
            status: statusRecord || {
              status: ComplianceStatus.UPCOMING,
              datePaid: null,
            },
            reminders,
          },
          "Compliance calendar details fetched successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/compliancecalendar/public/:id/status
   * Update compliance status (Paid/YetToPay/Missed)
   */
  static async updateComplianceStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: employerId } = (req as any).user;
      const { id: calendarId } = req.params;
      const { status, datePaid, notes } = req.body;

      if (!mongoose.Types.ObjectId.isValid(calendarId)) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid compliance calendar ID"));
      }

      if (
        !status ||
        ![ComplianceStatus.PAID, ComplianceStatus.YET_TO_PAY, ComplianceStatus.MISSED].includes(status)
      ) {
        return res.status(400).json(
          new ApiError(
            400,
            "Invalid status. Must be PAID, YET_TO_PAY, or MISSED"
          )
        );
      }

      if (status === ComplianceStatus.PAID && !datePaid) {
        return res
          .status(400)
          .json(
            new ApiError(400, "datePaid is required when status is PAID")
          );
      }

      const calendar = await ComplianceCalendar.findById(calendarId);
      if (!calendar) {
        return res
          .status(404)
          .json(new ApiError(404, "Compliance calendar not found"));
      }

      // Update or create status record
      const statusData: any = {
        complianceCalendarId: calendarId,
        employerId,
        status,
        notes,
        updatedBy: employerId,
      };

      if (status === ComplianceStatus.PAID) {
        statusData.datePaid = new Date(datePaid);
      }

      let statusRecord = await ComplianceCalendarStatus.findOne({
        complianceCalendarId: calendarId,
        employerId,
      });

      if (statusRecord) {
        // Update existing
        statusRecord.status = status;
        statusRecord.datePaid = statusData.datePaid;
        statusRecord.notes = notes;
        statusRecord.updatedBy = employerId;
        await statusRecord.save();
      } else {
        // Create new
        statusRecord = await ComplianceCalendarStatus.create({
          ...statusData,
          createdBy: employerId,
        });
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            statusRecord,
            `Compliance status updated to ${status}`
          )
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/compliancecalendar/public/:id/reminder/set
   * Set reminder for compliance
   */
  static async setReminder(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: employerId } = (req as any).user;
      const { id: calendarId } = req.params;
      const { channels = ["IN_APP"] } = req.body;

      if (!mongoose.Types.ObjectId.isValid(calendarId)) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid compliance calendar ID"));
      }

      const calendar = await ComplianceCalendar.findById(calendarId);
      if (!calendar) {
        return res
          .status(404)
          .json(new ApiError(404, "Compliance calendar not found"));
      }

      // Get or create status
      let statusRecord = await ComplianceCalendarStatus.findOne({
        complianceCalendarId: calendarId,
        employerId,
      });

      if (!statusRecord) {
        statusRecord = await ComplianceCalendarStatus.create({
          complianceCalendarId: calendarId,
          employerId,
          status: ComplianceStatus.UPCOMING,
          createdBy: employerId,
          updatedBy: employerId,
        });
      }

      // Create reminders (7 days before, 1 day before, on due date)
      const dueDate = new Date(calendar.eventDate);
      const reminderDates = [
        {
          type: "BEFORE_7_DAYS",
          days: 7,
        },
        {
          type: "BEFORE_1_DAY",
          days: 1,
        },
        {
          type: "ON_DUE_DATE",
          days: 0,
        },
      ];

      const reminders = [];
      for (const reminder of reminderDates) {
        const scheduledDate = new Date(dueDate);
        scheduledDate.setDate(scheduledDate.getDate() - reminder.days);

        // Check if reminder already exists
        const existingReminder = await ComplianceCalendarReminder.findOne({
          complianceCalendarStatusId: statusRecord._id,
          reminderType: reminder.type,
        });

        if (!existingReminder) {
          const reminderRecord = await ComplianceCalendarReminder.create({
            complianceCalendarStatusId: statusRecord._id,
            complianceCalendarId: calendarId,
            employerId,
            reminderType: reminder.type,
            channels,
            status: "PENDING",
            scheduledFor: scheduledDate,
            retryCount: 0,
          });
          reminders.push(reminderRecord);
        }
      }

      return res
        .status(201)
        .json(
          new ApiResponse(201, reminders, "Reminders set successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/compliancecalendar/public/:id/attachments
   * Upload proof documents for payment
   */
  static async uploadAttachment(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: employerId } = (req as any).user;
      const { id: calendarId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(calendarId)) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid compliance calendar ID"));
      }

      const attachmentUrl = req?.body?.document?.[0]?.url;
      if (!attachmentUrl) {
        return res
          .status(400)
          .json(new ApiError(400, "No document uploaded"));
      }

      let statusRecord = await ComplianceCalendarStatus.findOne({
        complianceCalendarId: calendarId,
        employerId,
      });

      if (!statusRecord) {
        statusRecord = await ComplianceCalendarStatus.create({
          complianceCalendarId: calendarId,
          employerId,
          status: ComplianceStatus.UPCOMING,
          createdBy: employerId,
          updatedBy: employerId,
        });
      }

      if (!statusRecord.attachments) {
        statusRecord.attachments = [];
      }

      statusRecord.attachments.push(attachmentUrl);
      statusRecord.updatedBy = employerId;
      await statusRecord.save();

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            statusRecord,
            "Document uploaded successfully"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/compliancecalendar/public/status/summary
   * Get compliance summary for employer
   */
  static async getComplianceSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: employerId } = (req as any).user;

      const statuses = await ComplianceCalendarStatus.aggregate([
        { $match: { employerId: new mongoose.Types.ObjectId(employerId) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const summary: any = {
        UPCOMING: 0,
        YET_TO_PAY: 0,
        PAID: 0,
        MISSED: 0,
      };

      statuses.forEach((s: any) => {
        summary[s._id] = s.count;
      });

      return res
        .status(200)
        .json(
          new ApiResponse(200, summary, "Compliance summary fetched successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/compliancecalendar/public/history
   * Get compliance history for audit
   */
  static async getComplianceHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: employerId } = (req as any).user;
      const { limit = 20, skip = 0 } = req.query;

      const history = await ComplianceCalendarStatus.find({
        employerId,
      })
        .populate("complianceCalendarId", "title eventDate eventType")
        .sort({ updatedAt: -1 })
        .limit(Number(limit))
        .skip(Number(skip))
        .lean();

      const total = await ComplianceCalendarStatus.countDocuments({
        employerId,
      });

      return res.status(200).json(
        new ApiResponse(
          200,
          { history, total, limit: Number(limit), skip: Number(skip) },
          "Compliance history fetched successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }
}
