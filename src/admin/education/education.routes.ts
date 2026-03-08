import express from "express";
import { EducationController } from "./education.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateTokenOptional } from "../../middlewares/authMiddleware";

const {
  createEducation,
  getAllEducation,
  getEducationById,
  createAllEducation,
  updateEducationById,
  deleteEducationById,
} = EducationController;

const router = express.Router();

router
  .post("/", asyncHandler(createEducation))
  .get("/", authenticateTokenOptional, asyncHandler(getAllEducation))
  .get("/:id", asyncHandler(getEducationById))
  .post("/all", asyncHandler(createAllEducation))
  .put("/:id", asyncHandler(updateEducationById))
  .delete("/:id", asyncHandler(deleteEducationById));

export default router;
