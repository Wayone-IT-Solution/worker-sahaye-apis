import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import {
  createContentBlock,
  getAllContentBlocks,
  getBlockContentById,
  getContentBlockByKey,
  updateContentBlockByKey,
  deleteContentBlockByKey,
} from "./contentblock.controller";
const router = express.Router();

router.get("/", authenticateToken, asyncHandler(getAllContentBlocks));
router.patch("/:key", authenticateToken, asyncHandler(getContentBlockByKey));
router.post("/", authenticateToken, isAdmin, asyncHandler(createContentBlock));
router.get("/:id", authenticateToken, isAdmin, asyncHandler(getBlockContentById));
router.put("/:id", authenticateToken, isAdmin, asyncHandler(updateContentBlockByKey));
router.delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteContentBlockByKey));

export default router;
