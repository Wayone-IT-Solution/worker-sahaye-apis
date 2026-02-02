import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HRMasterController } from "./hrmaster.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createHRMaster,
  getAllHRMasters,
  getHRMasterById,
  updateHRMasterById,
  deleteHRMasterById,
} = HRMasterController;

const router = express.Router();

router
  .get("/", asyncHandler(getAllHRMasters))
  .post("/", authenticateToken, isAdmin, asyncHandler(createHRMaster))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getHRMasterById))
  .put("/:id", authenticateToken, isAdmin, asyncHandler(updateHRMasterById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteHRMasterById));

export default router;
