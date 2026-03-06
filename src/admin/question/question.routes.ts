import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { QuestionController } from "./question.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  getFlows,
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestionById,
  deleteQuestionById,
  getQuestionByFlowAndStep
} = QuestionController;

const router = express.Router();

router
  .post("/", asyncHandler(createQuestion))
  .get("/", authenticateToken, isAdmin, asyncHandler(getAllQuestions))
  .get("/flows", authenticateToken, asyncHandler(getFlows))
  .get("/public", authenticateToken, asyncHandler(getQuestionByFlowAndStep))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getQuestionById))
  .put("/:id", authenticateToken, isAdmin, asyncHandler(updateQuestionById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteQuestionById));

export default router;
