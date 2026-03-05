import express from "express";
import {
  createServiceLocation,
  getLocationsByService,
  getAllServiceLocations,
  getServiceLocationById,
  updateServiceLocation,
  deleteServiceLocation,
} from "./servicelocation.controller";
import {
  isAdmin,
  authenticateToken,
  authenticateTokenOptional,
} from "../../middlewares/authMiddleware";

const router = express.Router();

// Public routes
router.get("/service/:serviceId", getLocationsByService);

// Admin routes (protected)
router.post("/", authenticateToken, isAdmin, createServiceLocation);
router.get("/", authenticateTokenOptional, getAllServiceLocations);
router.get("/:id", authenticateTokenOptional, getServiceLocationById);
router.put("/:id", authenticateToken, isAdmin, updateServiceLocation);
router.delete("/:id", authenticateToken, isAdmin, deleteServiceLocation);

export default router;
