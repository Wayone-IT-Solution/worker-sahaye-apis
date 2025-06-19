import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import {
  createContentBlock,
  getAllContentBlocks,
  getBlockContentById,
  updateContentBlockByKey,
  deleteContentBlockByKey,
} from "./contentblock.controller";

const router = express.Router();

router.get("/", authenticateToken, asyncHandler(getAllContentBlocks));
router.post("/", authenticateToken, asyncHandler(createContentBlock));
router.get("/:id", authenticateToken, asyncHandler(getBlockContentById));
router.put("/:id", authenticateToken, asyncHandler(updateContentBlockByKey));
router.delete("/:id", authenticateToken, asyncHandler(deleteContentBlockByKey));

export default router;
