import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ComplianceChecklistController } from "./compliancechecklist.controller";
import { allowAllExcept, authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createComplianceChecklist,
  getAllComplianceChecklists,
  getComplianceChecklistById,
  updateComplianceChecklistById,
  deleteComplianceChecklistById,
  getComplianceChecklistDetails
} = ComplianceChecklistController;

const router = express.Router();

router
  .get("/:userType",
    authenticateToken,
    isAdmin,
    asyncHandler(getAllComplianceChecklists))
  .get("/:userType/:id", authenticateToken, isAdmin, asyncHandler(getComplianceChecklistById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateComplianceChecklistById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteComplianceChecklistById))
  .post("/",
    authenticateToken,
    allowAllExcept(["admin", "agent", "worker"] as any),
    asyncHandler(createComplianceChecklist))
  .patch("/",
    authenticateToken,
    allowAllExcept(["admin", "agent", "worker"] as any),
    asyncHandler(getComplianceChecklistDetails));

export default router;
