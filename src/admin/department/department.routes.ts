import express from "express";
import { DepartmentController } from "./department.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateTokenOptional } from "../../middlewares/authMiddleware";

const {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  createAllDepartment,
  updateDepartmentById,
  deleteDepartmentById,
} = DepartmentController;

const router = express.Router();

router
  .post("/", asyncHandler(createDepartment))
  .get("/", authenticateTokenOptional, asyncHandler(getAllDepartments))
  .get("/:id", asyncHandler(getDepartmentById))
  .post("/all", asyncHandler(createAllDepartment))
  .put("/:id", asyncHandler(updateDepartmentById))
  .delete("/:id", asyncHandler(deleteDepartmentById));

export default router;
