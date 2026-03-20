import { Router } from "express";
import {
  authenticateToken,
  authenticateTokenOptional,
} from "../../middlewares/authMiddleware";
import {
  createEducationField,
  getAllEducationFields,
  getEducationFieldById,
  updateEducationField,
  deleteEducationField,
} from "./educationfield.controller";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Admin routes
router.post("/", authenticateToken, asyncHandler(createEducationField));
router.get("/", authenticateTokenOptional, asyncHandler(getAllEducationFields));
router.get("/:id", authenticateTokenOptional, asyncHandler(getEducationFieldById));
router.put("/:id", authenticateToken, asyncHandler(updateEducationField));
router.delete("/:id", authenticateToken, asyncHandler(deleteEducationField));

export default router;
