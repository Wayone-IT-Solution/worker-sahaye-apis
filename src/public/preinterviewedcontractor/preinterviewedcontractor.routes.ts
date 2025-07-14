import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { allowOnly, authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
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
    allowOnly(["contractor"] as any),
    asyncHandler(createPreInterviewedContractor))
  .patch("/",
    authenticateToken,
    allowOnly(["contractor"] as any),
    asyncHandler(getPreInterviewedContractorDetails));

export default router;
