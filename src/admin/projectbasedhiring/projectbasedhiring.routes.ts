import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authorizeFeature } from "../../middlewares/enrollMiddleware";
import { ProjectHiringController } from "./projectbasedhiring.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  assignVirtualHR,
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
  .post(
    "/:id/assign",
    authenticateToken,
    isAdmin,
    asyncHandler(assignVirtualHR)
  );

export default router;
