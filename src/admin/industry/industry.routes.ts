import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { IndustryController } from "./industry.controller";

const {
  createIndustry,
  getAllIndustrys,
  getIndustryById,
  createAllIndustry,
  updateIndustryById,
  deleteIndustryById,
} = IndustryController;

const router = express.Router();

router
  .post("/", asyncHandler(createIndustry))
  .get("/", asyncHandler(getAllIndustrys))
  .get("/:id", asyncHandler(getIndustryById))
  .post("/all", asyncHandler(createAllIndustry))
  .put("/:id", asyncHandler(updateIndustryById))
  .delete("/:id", asyncHandler(deleteIndustryById));

export default router;
