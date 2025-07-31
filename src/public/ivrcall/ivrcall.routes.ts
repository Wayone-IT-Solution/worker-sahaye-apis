import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { IVRCallController } from "./ivrcall.controller";
import { authenticateToken, isAdmin, isWorker } from "../../middlewares/authMiddleware";

const {
  createIVRCall,
  getAllIVRCalls,
  getIVRCallById,
  updateIVRCallById,
  deleteIVRCallById,
} = IVRCallController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllIVRCalls))
  .post("/", authenticateToken, isWorker, asyncHandler(createIVRCall))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getIVRCallById))
  .put(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateIVRCallById)
  )
  .delete(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(deleteIVRCallById)
  );

export default router;
