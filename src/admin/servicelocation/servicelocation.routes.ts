import express from "express";
import {
  createServiceLocation,
  getLocationsByService,
  getAllServiceLocations,
  getServiceLocationById,
  updateServiceLocation,
  deleteServiceLocation,
} from "./servicelocation.controller";
import { isAdmin, authenticateToken } from "../../middlewares/authMiddleware";

const router = express.Router();

// Public routes
router.get("/service/:serviceId", getLocationsByService);

// Admin routes (protected)
router.post("/", authenticateToken, isAdmin, createServiceLocation);
router.get("/", getAllServiceLocations);
router.get("/:id", getServiceLocationById);
router.put("/:id", authenticateToken, isAdmin, updateServiceLocation);
router.delete("/:id", authenticateToken, isAdmin, deleteServiceLocation);

export default router;
