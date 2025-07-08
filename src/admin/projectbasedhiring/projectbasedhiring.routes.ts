import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { ProjectHiringController } from "./projectbasedhiring.controller";

const {
  createProjectHiring,
  getAllProjectHirings,
  getProjectHiringById,
  updateProjectHiringById,
  deleteProjectHiringById,
} = ProjectHiringController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createProjectHiring))
  .get("/", authenticateToken, asyncHandler(getAllProjectHirings))
  .get("/:id", authenticateToken, asyncHandler(getProjectHiringById))
  .put("/:id", authenticateToken, asyncHandler(updateProjectHiringById))
  .delete("/:id", authenticateToken, asyncHandler(deleteProjectHiringById))

export default router;
