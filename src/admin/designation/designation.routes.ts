import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import DesignationController from "./designation.controller";
import {
  isAdmin,
  authenticateToken,
  authenticateTokenOptional,
} from "../../middlewares/authMiddleware";

const {
  createDesignation,
  getAllDesignations,
  getActiveDesignations,
  getDesignationById,
  updateDesignationById,
  deleteDesignationById,
  bulkUpload,
} = DesignationController as any;

const router = express.Router();

router
  .post("/", authenticateToken, isAdmin, asyncHandler(createDesignation))
  .post("/bulk", authenticateToken, isAdmin, asyncHandler(bulkUpload))
  .get("/", authenticateTokenOptional, asyncHandler(getAllDesignations))
  .get("/active/list", asyncHandler(getActiveDesignations))
  .get("/:id", asyncHandler(getDesignationById))
  .put("/:id", authenticateToken, isAdmin, asyncHandler(updateDesignationById))
  .delete(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(deleteDesignationById),
  );

export default router;
