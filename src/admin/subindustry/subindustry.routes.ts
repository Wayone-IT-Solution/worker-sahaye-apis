import { Router } from "express";
import { isAdmin, authenticateToken } from "../../middlewares/authMiddleware";
import {
  createSubIndustry,
  getAllSubIndustries,
  getSubIndustryById,
  updateSubIndustry,
  deleteSubIndustry,
  getSubIndustriesByIndustry,
} from "./subindustry.controller";

const router = Router();

// Public routes
router.get("/industry/:industryId", getSubIndustriesByIndustry);

// Admin routes
router.post("/", isAdmin, authenticateToken, createSubIndustry);
router.get("/", isAdmin, authenticateToken, getAllSubIndustries);
router.get("/:id", isAdmin, authenticateToken, getSubIndustryById);
router.put("/:id", isAdmin, authenticateToken, updateSubIndustry);
router.delete("/:id", isAdmin, authenticateToken, deleteSubIndustry);

export default router;
