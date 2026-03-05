import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { JobcategoryController } from "./jobcategory.controller";
import { authenticateTokenOptional } from "../../middlewares/authMiddleware";

const {
  createJobcategory,
  getAllJobcategorys,
  getJobcategoryById,
  createAllJobcategory,
  updateJobcategoryById,
  deleteJobcategoryById,
} = JobcategoryController;

const router = express.Router();

router
  .post("/", asyncHandler(createJobcategory))
  .get("/", authenticateTokenOptional, asyncHandler(getAllJobcategorys))
  .get("/:id", asyncHandler(getJobcategoryById))
  .post("/all", asyncHandler(createAllJobcategory))
  .put("/:id", asyncHandler(updateJobcategoryById))
  .delete("/:id", asyncHandler(deleteJobcategoryById));

export default router;
