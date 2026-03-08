import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import PublicFunctionController from "./function.controller";

const { getActiveFunctions, getFunctionById } = PublicFunctionController;

const router = express.Router();

router
  .get("/active/list", asyncHandler(getActiveFunctions))
  .get("/:id", asyncHandler(getFunctionById));

export default router;
