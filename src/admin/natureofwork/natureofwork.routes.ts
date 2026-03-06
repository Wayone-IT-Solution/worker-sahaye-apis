import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { NatureOfWorkController } from "./natureofwork.controller";
import { authenticateTokenOptional } from "../../middlewares/authMiddleware";

const {
  createNatureOfWork,
  getAllNatureOfWorks,
  getNatureOfWorkById,
  createAllNatureOfWork,
  updateNatureOfWorkById,
  deleteNatureOfWorkById,
} = NatureOfWorkController;

const router = express.Router();

router
  .post("/", asyncHandler(createNatureOfWork))
  .get("/", authenticateTokenOptional, asyncHandler(getAllNatureOfWorks))
  .get("/:id", asyncHandler(getNatureOfWorkById))
  .post("/all", asyncHandler(createAllNatureOfWork))
  .put("/:id", asyncHandler(updateNatureOfWorkById))
  .delete("/:id", asyncHandler(deleteNatureOfWorkById));

export default router;
