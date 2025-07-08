import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { BulkHiringController } from "./bulkhiring.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const {
  createBulkHiring,
  getAllBulkHirings,
  getBulkHiringById,
  updateBulkHiringById,
  deleteBulkHiringById,
} = BulkHiringController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createBulkHiring))
  .get("/", authenticateToken, asyncHandler(getAllBulkHirings))
  .get("/:id", authenticateToken, asyncHandler(getBulkHiringById))
  .put("/:id", authenticateToken, asyncHandler(updateBulkHiringById))
  .delete("/:id", authenticateToken, asyncHandler(deleteBulkHiringById));

export default router;
