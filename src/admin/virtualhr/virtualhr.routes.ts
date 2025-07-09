import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { VirtualHRController } from "./virtualhr.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const {
  createVirtualHR,
  getAllVirtualHRs,
  getVirtualHRById,
  updateVirtualHRById,
  deleteVirtualHRById,
} = VirtualHRController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createVirtualHR))
  .get("/", authenticateToken, asyncHandler(getAllVirtualHRs))
  .get("/:id", authenticateToken, asyncHandler(getVirtualHRById))
  .put("/:id", authenticateToken, asyncHandler(updateVirtualHRById))
  .delete("/:id", authenticateToken, asyncHandler(deleteVirtualHRById))

export default router;
