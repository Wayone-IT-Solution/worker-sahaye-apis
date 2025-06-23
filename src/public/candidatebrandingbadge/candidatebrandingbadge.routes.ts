import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { CandidateBrandingBadgeController } from "./candidatebrandingbadge.controller";

const {
  createCandidateBrandingBadge,
  getAllCandidateBrandingBadges,
  getCandidateBrandingBadgeById,
  updateCandidateBrandingBadgeById,
  deleteCandidateBrandingBadgeById,
} = CandidateBrandingBadgeController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createCandidateBrandingBadge))
  .get("/", authenticateToken, asyncHandler(getAllCandidateBrandingBadges))
  .get("/:id", authenticateToken, asyncHandler(getCandidateBrandingBadgeById))
  .put(
    "/:id",
    authenticateToken,
    asyncHandler(updateCandidateBrandingBadgeById)
  )
  .delete(
    "/:id",
    authenticateToken,
    asyncHandler(deleteCandidateBrandingBadgeById)
  );

export default router;
