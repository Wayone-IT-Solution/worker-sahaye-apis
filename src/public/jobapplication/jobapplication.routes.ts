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
} from "./jobapplication.controller";

const router = express.Router();

router.post("/", authenticateToken, isWorker, asyncHandler(applyToJob));
router.get("/", authenticateToken, isWorker, asyncHandler(getUserApplications));
router.get(
  "/all/applications",
  authenticateToken,
  asyncHandler(getAllUserApplications)
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
