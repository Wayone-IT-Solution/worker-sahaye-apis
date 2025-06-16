import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { JobcategoryController } from "./jobcategory.controller";

const {
  createJobcategory,
  getAllJobcategorys,
  getJobcategoryById,
  updateJobcategoryById,
  deleteJobcategoryById,
} = JobcategoryController;

const router = express.Router();

router
  .post("/", asyncHandler(createJobcategory))
  .get("/", asyncHandler(getAllJobcategorys))
  .get("/:id", asyncHandler(getJobcategoryById))
  .put("/:id", asyncHandler(updateJobcategoryById))
  .delete("/:id", asyncHandler(deleteJobcategoryById));

export default router;
