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
import { isAdmin, authenticateToken } from "../../middlewares/authMiddleware";

const router = express.Router();

// Public routes
router.get("/type/:serviceFor", getServicesByType);

// Admin routes (protected)
router.post("/", authenticateToken, isAdmin, createSupportService);
router.get("/", getAllSupportServices);
router.get("/search/query", searchSupportServices);
router.get("/:id", getSupportServiceById);
router.put("/:id", authenticateToken, isAdmin, updateSupportService);
router.delete("/:id", authenticateToken, isAdmin, deleteSupportService);

export default router;
