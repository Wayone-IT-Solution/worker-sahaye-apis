import express from "express";
import { SkillsController } from "./skills.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateTokenOptional } from "../../middlewares/authMiddleware";

const {
  createSkills,
  getAllSkills,
  getSkillsById,
  createAllSkills,
  updateSkillsById,
  deleteSkillsById,
} = SkillsController;

const router = express.Router();

router
  .post("/", asyncHandler(createSkills))
  .get("/", authenticateTokenOptional, asyncHandler(getAllSkills))
  .get("/:id", asyncHandler(getSkillsById))
  .post("/all", asyncHandler(createAllSkills))
  .put("/:id", asyncHandler(updateSkillsById))
  .delete("/:id", asyncHandler(deleteSkillsById));

export default router;
