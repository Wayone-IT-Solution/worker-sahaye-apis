import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { NatureOfWorkController } from "./natureofwork.controller";

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
  .get("/", asyncHandler(getAllNatureOfWorks))
  .get("/:id", asyncHandler(getNatureOfWorkById))
  .post("/all", asyncHandler(createAllNatureOfWork))
  .put("/:id", asyncHandler(updateNatureOfWorkById))
  .delete("/:id", asyncHandler(deleteNatureOfWorkById));

export default router;
