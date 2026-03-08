import express from "express";
import { FunctionController } from "./function.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  authenticateTokenOptional,
  authenticateToken,
  isAdmin,
} from "../../middlewares/authMiddleware";

const {
  createFunction,
  getAllFunctions,
  getActiveFunctions,
  getFunctionById,
  createAllFunction,
  updateFunctionById,
  deleteFunctionById,
} = FunctionController;

const router = express.Router();

router
  .post("/", authenticateToken, isAdmin, asyncHandler(createFunction))
  .get("/", authenticateTokenOptional, asyncHandler(getAllFunctions))
  .get("/active/list", asyncHandler(getActiveFunctions))
  .get("/:id", asyncHandler(getFunctionById))
  .post("/all", authenticateToken, isAdmin, asyncHandler(createAllFunction))
  .put("/:id", authenticateToken, isAdmin, asyncHandler(updateFunctionById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteFunctionById));

export default router;
