import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { WorkercategoryController } from "./workercategory.controller";

const {
  createWorkercategory,
  getAllWorkercategorys,
  getWorkercategoryById,
  updateWorkercategoryById,
  deleteWorkercategoryById,
} = WorkercategoryController;

const router = express.Router();

router
  .post("/", asyncHandler(createWorkercategory))
  .get("/", asyncHandler(getAllWorkercategorys))
  .get("/:id", asyncHandler(getWorkercategoryById))
  .put("/:id", asyncHandler(updateWorkercategoryById))
  .delete("/:id", asyncHandler(deleteWorkercategoryById));

export default router;
