import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { BulkHiringController } from "./bulkhiring.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { authorizeFeature } from "../../middlewares/enrollMiddleware";

const {
  createBulkHiring,
  getAllBulkHirings,
  getBulkHiringById,
  updateBulkHiringById,
  deleteBulkHiringById,
} = BulkHiringController;

const router = express.Router();

router
  .post("/", authenticateToken, authorizeFeature("bulk_hiring"), asyncHandler(createBulkHiring))
  .get("/", authenticateToken, authorizeFeature("bulk_hiring"), asyncHandler(getAllBulkHirings))
  .get("/:id", authenticateToken, asyncHandler(getBulkHiringById))
  .put("/:id", authenticateToken, authorizeFeature("bulk_hiring"), asyncHandler(updateBulkHiringById))
  .delete("/:id", authenticateToken, asyncHandler(deleteBulkHiringById));

export default router;
