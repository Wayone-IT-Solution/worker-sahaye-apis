import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ProjectHiringController } from "./projectbasedhiring.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  updateStatus,
  assignVirtualHR,
  assignSalesPerson,
  createProjectHiring,
  getAllProjectHirings,
  getProjectHiringById,
  updateProjectHiringById,
  deleteProjectHiringById,
  checkProjectBasedHiringServiceEligibilityEndpoint,
} = ProjectHiringController;

const router = express.Router();

router
  .get("/eligibility/check", authenticateToken, asyncHandler(checkProjectBasedHiringServiceEligibilityEndpoint))
  .post("/", authenticateToken, asyncHandler(createProjectHiring))
  .get("/", authenticateToken, asyncHandler(getAllProjectHirings))
  .get("/:id", authenticateToken, asyncHandler(getProjectHiringById))
  .put("/:id", authenticateToken, asyncHandler(updateProjectHiringById))
  .delete("/:id", authenticateToken, asyncHandler(deleteProjectHiringById))
  .post(
    "/:id/assign",
    authenticateToken,
    isAdmin,
    asyncHandler(assignVirtualHR)
  )
  .post(
    "/:id/sales",
    authenticateToken,
    isAdmin,
    asyncHandler(assignSalesPerson)
  )
  .patch(
    "/:id/update-status",
    authenticateToken,
    asyncHandler(updateStatus)
  )

export default router;
