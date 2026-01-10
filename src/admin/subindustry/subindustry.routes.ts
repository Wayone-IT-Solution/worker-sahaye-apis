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
router.post("/",  authenticateToken, createSubIndustry);
router.get("/",  authenticateToken, getAllSubIndustries);
router.get("/:id",  authenticateToken, getSubIndustryById);
router.put("/:id",  authenticateToken, updateSubIndustry);
router.delete("/:id",  authenticateToken, deleteSubIndustry);

export default router;
