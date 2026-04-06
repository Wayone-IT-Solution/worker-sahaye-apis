import { Router } from "express";
import { FestivalController } from "./festival.controller";

const router = Router();

// Create festival date
router.post("/", FestivalController.createFestival);

// Get all festival dates
router.get("/", FestivalController.getAllFestivals);

// Get festival date by ID
router.get("/:id", FestivalController.getFestivalById);

// Delete festival date
router.delete("/:id", FestivalController.deleteFestival);

export default router;
