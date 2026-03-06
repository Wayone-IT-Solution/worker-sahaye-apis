import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  isWorker,
  isEmployer,
  isContractor,
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
  checkContractorJobApplicationEligibility,
} from "./jobapplication.controller";

const router = express.Router();

// Check job application eligibility for workers
router.get("/eligibility/check", authenticateToken, isWorker, asyncHandler(checkJobApplicationEligibility));

// Check job application eligibility for contractors
router.get("/contractor/eligibility/check", authenticateToken, isContractor, asyncHandler(checkContractorJobApplicationEligibility));

// Allow both workers and contractors to apply to jobs
router.post("/", authenticateToken, asyncHandler(applyToJob));
// Allow both workers and contractors to view their applications
router.get("/", authenticateToken, asyncHandler(getUserApplications));
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
  asyncHandler(getApplicationById)
);
router.get(
  "/offer-accepted/:id",
  authenticateToken,
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
