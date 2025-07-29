import { Router } from "express";
import {
  deleteSlot,
  createSlots,
  addMoreSlots,
  getSlotsByDate,
  getNextDaysSlots,
} from "./slot.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const router = Router();

router.get("/", authenticateToken, asyncHandler(getSlotsByDate));
router.get("/:id", authenticateToken, asyncHandler(getNextDaysSlots));
router.post("/", authenticateToken, isAdmin, asyncHandler(createSlots));
router.delete("/", authenticateToken, isAdmin, asyncHandler(deleteSlot));
router.post("/add", authenticateToken, isAdmin, asyncHandler(addMoreSlots));

export default router;