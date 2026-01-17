import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { UserPreferenceController } from "./userpreference.controller";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";

const {
  getAllUserPreferences,
  getUserPreferenceById,
  updateUserPreferenceById,
  deleteUserPreferenceById,
  getAllUniquePreferredLocations,
} = UserPreferenceController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllUserPreferences))
  .get("/location", authenticateToken, asyncHandler(getAllUniquePreferredLocations))
  .get("/:id", authenticateToken, asyncHandler(getUserPreferenceById))
  .put("/", authenticateToken, isWorker, asyncHandler(updateUserPreferenceById))
  .delete("/:id", authenticateToken, asyncHandler(deleteUserPreferenceById));

export default router;
