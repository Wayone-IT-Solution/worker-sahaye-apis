import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { EmployerFeedbackController } from "./employerfeedback.controller";

const {
  createEmployerFeedback,
  getAllEmployerFeedbacks,
  getEmployerFeedbackById,
  deleteEmployerFeedbackById,
} = EmployerFeedbackController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createEmployerFeedback))
  .get("/", authenticateToken, asyncHandler(getAllEmployerFeedbacks))
  .get("/:id", authenticateToken, asyncHandler(getEmployerFeedbackById))
  .delete("/:id", authenticateToken, asyncHandler(deleteEmployerFeedbackById));

export default router;
