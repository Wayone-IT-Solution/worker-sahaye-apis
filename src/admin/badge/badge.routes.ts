import express from "express";
import { BadgeController } from "./badge.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createBadge,
  getAllBadges,
  getBadgeById,
  updateBadgeById,
  deleteBadgeById,
  getAllUserBadges,
} = BadgeController;
BadgeController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllBadges))
  .patch("/", authenticateToken, asyncHandler(getAllUserBadges))
  .post("/", authenticateToken, isAdmin, asyncHandler(createBadge))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getBadgeById))
  .put("/:id", authenticateToken, isAdmin, asyncHandler(updateBadgeById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteBadgeById));

export default router;
