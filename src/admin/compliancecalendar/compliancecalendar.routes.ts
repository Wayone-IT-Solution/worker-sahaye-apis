import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { ComplianceCalendarController } from "./compliancecalendar.controller";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";

const {
  createComplianceCalendar,
  getAllComplianceCalendars,
  getComplianceCalendarById,
  updateComplianceCalendarById,
  deleteComplianceCalendarById,
} = ComplianceCalendarController;

const router = express.Router();

router
  .post(
    "/",
    authenticateToken,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(createComplianceCalendar)
  )
  .get("/", authenticateToken, asyncHandler(getAllComplianceCalendars))
  .get("/:id", authenticateToken, asyncHandler(getComplianceCalendarById))
  .put(
    "/:id",
    authenticateToken,
    dynamicUpload([{ name: "document", maxCount: 1 }]),
    s3UploaderMiddleware("document"),
    asyncHandler(updateComplianceCalendarById)
  )
  .delete(
    "/:id",
    authenticateToken,
    asyncHandler(deleteComplianceCalendarById)
  );

export default router;
