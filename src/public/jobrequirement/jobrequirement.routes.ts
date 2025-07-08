// Jobrequirement Routes
import express from "express";
import {
  createJobrequirement,
  getAllJobrequirements,
  getJobrequirementById,
  updateJobrequirementById,
  deleteJobrequirementById,
} from "./jobrequirement.controller";

const router = express.Router();

router
  .post("/", createJobrequirement)
  .get("/", getAllJobrequirements)
  .get("/:id", getJobrequirementById)
  .put("/:id", updateJobrequirementById)
  .delete("/:id", deleteJobrequirementById);

export default router;
