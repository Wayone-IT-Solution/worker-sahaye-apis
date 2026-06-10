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
import { cacheGetResponse, invalidateCacheAfterSuccess } from "../../middlewares/cacheMiddleware";

const router = express.Router();

// Route with optional authentication - allows both authenticated and unauthenticated users
router.get("/type/:serviceFor", authenticateTokenOptional, cacheGetResponse("SupportService", { varyByUser: true, logLabel: "supportservice-type" }), getServicesByType);

// Routes that work with or without authentication (optional auth for user context)
router.get("/", authenticateTokenOptional, cacheGetResponse("SupportService", { varyByUser: true, logLabel: "supportservice-all" }), getAllSupportServices);
router.get("/search/query", authenticateTokenOptional, cacheGetResponse("SupportService", { varyByUser: true, logLabel: "supportservice-search" }), searchSupportServices);
router.get("/:id", authenticateTokenOptional, cacheGetResponse("SupportService", { varyByUser: true, logLabel: "supportservice-by-id" }), getSupportServiceById);

// Admin routes (protected)
router.post("/", authenticateToken, isAdmin, invalidateCacheAfterSuccess("SupportService", { logLabel: "supportservice-create" }), createSupportService);
router.put("/:id", authenticateToken, isAdmin, invalidateCacheAfterSuccess("SupportService", { logLabel: "supportservice-update" }), updateSupportService);
router.delete("/:id", authenticateToken, isAdmin, invalidateCacheAfterSuccess("SupportService", { logLabel: "supportservice-delete" }), deleteSupportService);

export default router;
