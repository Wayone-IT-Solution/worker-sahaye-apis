import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { SaveItemController } from "./saveitems.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { checkSaveLimit } from "../../middlewares/saveLimitMiddleware";

const router = express.Router();

/**
 * Routes for SaveItems functionality
 * Base path: /api/saveitems
 */

// Save an item (with subscription limit enforcement)
router.post(
  "/",
  authenticateToken,
  asyncHandler(checkSaveLimit),
  asyncHandler(SaveItemController.saveItem),
);

// Get all saved items for authenticated user
router.get(
  "/",
  authenticateToken,
  asyncHandler(SaveItemController.getSaveItems),
);

// Remove saved item
router.delete(
  "/:saveItemId",
  authenticateToken,
  asyncHandler(SaveItemController.removeSaveItem),
);

export default router;
