// Workercategory Routes
import express from "express";
import {
  createWorkercategory,
  getAllWorkercategorys,
  getWorkercategoryById,
  updateWorkercategoryById,
  deleteWorkercategoryById,
} from "./workercategory.controller";

const router = express.Router();

router
  .post("/", createWorkercategory)
  .get("/", getAllWorkercategorys)
  .get("/:id", getWorkercategoryById)
  .put("/:id", updateWorkercategoryById)
  .delete("/:id", deleteWorkercategoryById);

export default router;
