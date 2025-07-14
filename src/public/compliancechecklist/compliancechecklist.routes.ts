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
  .get("/",
    authenticateToken,
    isAdmin,
    asyncHandler(getAllComplianceChecklists))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getComplianceChecklistById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateComplianceChecklistById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteComplianceChecklistById))
  .post("/",
    authenticateToken,
    allowAllExcept(["admin", "agent"] as any),
    asyncHandler(createComplianceChecklist))
  .patch("/",
    authenticateToken,
    allowAllExcept(["admin", "agent"] as any),
    asyncHandler(getComplianceChecklistDetails));

export default router;
