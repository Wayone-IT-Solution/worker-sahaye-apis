import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin, isContractor } from "../../middlewares/authMiddleware";
import { PreInterviewedContractorController } from "./preinterviewedcontractor.controller";

const {
  createPreInterviewedContractor,
  getAllPreInterviewedContractors,
  getPreInterviewedContractorById,
  updatePreInterviewedContractorById,
  deletePreInterviewedContractorById,
  getPreInterviewedContractorDetails
} = PreInterviewedContractorController;

const router = express.Router();

router
  .get("/", authenticateToken, isAdmin, asyncHandler(getAllPreInterviewedContractors))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getPreInterviewedContractorById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updatePreInterviewedContractorById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deletePreInterviewedContractorById))
  .post("/",
    authenticateToken,
    isContractor,
    asyncHandler(createPreInterviewedContractor))
  .patch("/",
    authenticateToken,
    isContractor,
    asyncHandler(getPreInterviewedContractorDetails));

export default router;
