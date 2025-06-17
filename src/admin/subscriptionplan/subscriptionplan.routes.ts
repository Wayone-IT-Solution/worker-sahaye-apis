import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { SubscriptionplanController } from "./subscriptionplan.controller";

const {
  createSubscriptionplan,
  getAllSubscriptionplans,
  getSubscriptionplanById,
  updateSubscriptionplanById,
  deleteSubscriptionplanById,
} = SubscriptionplanController;

const router = express.Router();

router
  .post("/", asyncHandler(createSubscriptionplan))
  .get("/", asyncHandler(getAllSubscriptionplans))
  .get("/:id", asyncHandler(getSubscriptionplanById))
  .put("/:id", asyncHandler(updateSubscriptionplanById))
  .delete("/:id", asyncHandler(deleteSubscriptionplanById));

export default router;
