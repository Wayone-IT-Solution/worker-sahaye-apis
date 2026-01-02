import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { ComplianceCalendarController } from "./compliancecalendar.controller";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";

const router = express.Router();

router
  .post(
    "/",
    authenticateToken,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(ComplianceCalendarController.createComplianceCalendar)
  )
  .get("/", authenticateToken, asyncHandler(ComplianceCalendarController.getAllComplianceCalendars))
  .get("/:id", authenticateToken, asyncHandler(ComplianceCalendarController.getComplianceCalendarById))
  .put(
    "/:id",
    authenticateToken,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(ComplianceCalendarController.updateComplianceCalendarById)
  )
  .delete(
    "/:id",
    authenticateToken,
    asyncHandler(ComplianceCalendarController.deleteComplianceCalendarById)
  );

export default router;
