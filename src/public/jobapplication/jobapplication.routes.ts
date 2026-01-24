import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  isWorker,
  isEmployer,
  authenticateToken,
} from "../../middlewares/authMiddleware";
import {
  applyToJob,
  getApplicationById,
  getUserApplications,
  withdrawApplication,
  handleInterviewMode,
  handleOfferAccepted,
  updateStatusByEmployer,
  getAllUserApplications,
  getReceivedApplications,
  checkJobApplicationEligibility,
} from "./jobapplication.controller";

const router = express.Router();

// Check job application eligibility
router.get("/eligibility/check", authenticateToken, isWorker, asyncHandler(checkJobApplicationEligibility));

router.post("/", authenticateToken, isWorker, asyncHandler(applyToJob));
router.get("/", authenticateToken, isWorker, asyncHandler(getUserApplications));
router.get(
  "/all/:userType?",
  authenticateToken,
  asyncHandler(getAllUserApplications)
);
router.get(
  "/all/:userType/:id",
  authenticateToken,
  asyncHandler(getApplicationById)
);
router.get(
  "/:id",
  authenticateToken,
  isWorker,
  asyncHandler(getApplicationById)
);
router.get(
  "/offer-accepted/:id",
  authenticateToken,
  isWorker,
  asyncHandler(handleOfferAccepted)
);
router.get(
  "/received/applications",
  authenticateToken,
  asyncHandler(getReceivedApplications)
);
router.patch(
  "/:id/withdraw",
  authenticateToken,
  isWorker,
  asyncHandler(withdrawApplication)
);
router.put(
  "/:id",
  authenticateToken,
  isEmployer,
  asyncHandler(updateStatusByEmployer)
);
router.put(
  "/interview-status/:id",
  authenticateToken,
  isWorker,
  asyncHandler(handleInterviewMode)
);

export default router;
