import express from "express";
import {
  createSupportService,
  getAllSupportServices,
  getServicesByType,
  getSupportServiceById,
  updateSupportService,
  deleteSupportService,
  searchSupportServices,
} from "./supportservice.controller";
import { isAdmin, authenticateToken, authenticateTokenOptional } from "../../middlewares/authMiddleware";

const router = express.Router();

// Route with optional authentication - allows both authenticated and unauthenticated users
router.get("/type/:serviceFor", authenticateTokenOptional, getServicesByType);

// Routes that work with or without authentication (optional auth for user context)
router.get("/", authenticateTokenOptional, getAllSupportServices);
router.get("/search/query", authenticateTokenOptional, searchSupportServices);
router.get("/:id", authenticateTokenOptional, getSupportServiceById);

// Admin routes (protected)
router.post("/", authenticateToken, isAdmin, createSupportService);
router.put("/:id", authenticateToken, isAdmin, updateSupportService);
router.delete("/:id", authenticateToken, isAdmin, deleteSupportService);

export default router;
