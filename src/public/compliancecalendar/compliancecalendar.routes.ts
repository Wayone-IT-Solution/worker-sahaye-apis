import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { PublicComplianceCalendarController } from "./compliancecalendar.controller";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";

const router = express.Router();

/**
 * @route   GET /api/compliancecalendar
 * @desc    Get all compliance calendars for employer
 * @access  Private (Employer)
 */
router.get("/", authenticateToken, asyncHandler(PublicComplianceCalendarController.getComplianceCalendars));

/**
 * @route   GET /api/compliancecalendar/summary
 * @desc    Get compliance summary (PAID/YET_TO_PAY/MISSED count)
 * @access  Private (Employer)
 */
router.get("/summary", authenticateToken, asyncHandler(PublicComplianceCalendarController.getComplianceSummary));

/**
 * @route   GET /api/compliancecalendar/history
 * @desc    Get compliance payment history
 * @access  Private (Employer)
 */
router.get("/history", authenticateToken, asyncHandler(PublicComplianceCalendarController.getComplianceHistory));

/**
 * @route   GET /api/compliancecalendar/:id
 * @desc    Get single compliance calendar with status and reminders
 * @access  Private (Employer)
 */
router.get("/:id", authenticateToken, asyncHandler(PublicComplianceCalendarController.getComplianceCalendarDetail));

/**
 * @route   POST /api/compliancecalendar/:id/status
 * @desc    Update compliance status (PAID/YET_TO_PAY/MISSED)
 * @access  Private (Employer)
 * @body    { status, datePaid?, notes? }
 */
router.post("/:id/status", authenticateToken, asyncHandler(PublicComplianceCalendarController.updateComplianceStatus));

/**
 * @route   POST /api/compliancecalendar/:id/reminder/set
 * @desc    Set reminders (7 days, 1 day, due date)
 * @access  Private (Employer)
 * @body    { channels: ["IN_APP", "WHATSAPP", "EMAIL"] }
 */
router.post(
  "/:id/reminder/set",
  authenticateToken,
  asyncHandler(PublicComplianceCalendarController.setReminder)
);

/**
 * @route   POST /api/compliancecalendar/:id/attachments
 * @desc    Upload proof documents for compliance
 * @access  Private (Employer)
 */
router.post(
  "/:id/attachments",
  authenticateToken,
  dynamicUpload([{ name: "document", maxCount: 1 }]),
  s3UploaderMiddleware("document"),
  asyncHandler(PublicComplianceCalendarController.uploadAttachment)
);

export default router;
