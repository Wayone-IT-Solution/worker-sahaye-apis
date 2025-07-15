import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { authorizeFeature } from "../../middlewares/enrollMiddleware";
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
  .post("/", authenticateToken, authorizeFeature("project_based_hiring"), asyncHandler(createProjectHiring))
  .get("/", authenticateToken, authorizeFeature("project_based_hiring"), asyncHandler(getAllProjectHirings))
  .get("/:id", authenticateToken, asyncHandler(getProjectHiringById))
  .put("/:id", authenticateToken, authorizeFeature("project_based_hiring"), asyncHandler(updateProjectHiringById))
  .delete("/:id", authenticateToken, asyncHandler(deleteProjectHiringById))

export default router;
