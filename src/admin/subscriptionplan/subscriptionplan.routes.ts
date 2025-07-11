import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { SubscriptionplanController } from "./subscriptionplan.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createSubscriptionplan,
  getAllSubscriptionplans,
  getSubscriptionplanById,
  updateSubscriptionplanById,
  deleteSubscriptionplanById,
} = SubscriptionplanController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllSubscriptionplans))
  .post("/", authenticateToken, isAdmin, asyncHandler(createSubscriptionplan))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getSubscriptionplanById))
  .put("/:id", authenticateToken, isAdmin, asyncHandler(updateSubscriptionplanById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteSubscriptionplanById));

export default router;
