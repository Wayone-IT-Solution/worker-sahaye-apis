import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { GratuityRecordController } from "./gratuityrecord.controller";
import { authenticateToken, isWorker } from "../../middlewares/authMiddleware";

const {
  getAllGratuityRecords,
  getGratuityRecordById,
  createGratuityRecord,
  deleteGratuityRecordById,
} = GratuityRecordController;

const router = express.Router();

router
  .post("/", authenticateToken, isWorker, asyncHandler(createGratuityRecord))
  .get("/", authenticateToken, asyncHandler(getAllGratuityRecords))
  .get("/:id", authenticateToken, asyncHandler(getGratuityRecordById))
  .delete("/:id", authenticateToken, asyncHandler(deleteGratuityRecordById));

export default router;
