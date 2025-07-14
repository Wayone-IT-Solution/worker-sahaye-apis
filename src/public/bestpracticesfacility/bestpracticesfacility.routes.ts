import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { BestPracticesFacilityController } from "./bestpracticesfacility.controller";
import { authenticateToken, isAdmin, isEmployer } from "../../middlewares/authMiddleware";

const {
  createBestPracticesFacility,
  getAllBestPracticesFacilitys,
  getBestPracticesFacilityById,
  updateBestPracticesFacilityById,
  deleteBestPracticesFacilityById,
  getBestPracticesFacilityDetails
} = BestPracticesFacilityController;

const router = express.Router();

router
  .get("/",
    authenticateToken,
    isAdmin,
    asyncHandler(getAllBestPracticesFacilitys))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getBestPracticesFacilityById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateBestPracticesFacilityById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteBestPracticesFacilityById))
  .post("/",
    authenticateToken,
    isEmployer,
    asyncHandler(createBestPracticesFacility))
  .patch("/",
    authenticateToken,
    isEmployer,
    asyncHandler(getBestPracticesFacilityDetails));

export default router;
