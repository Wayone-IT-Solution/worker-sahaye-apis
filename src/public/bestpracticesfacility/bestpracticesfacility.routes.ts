import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { BestPracticesFacilityController } from "./bestpracticesfacility.controller";
import { allowAllExcept, authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

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
    allowAllExcept(["admin", "agent"] as any),
    asyncHandler(createBestPracticesFacility))
  .patch("/",
    authenticateToken,
    allowAllExcept(["admin", "agent"] as any),
    asyncHandler(getBestPracticesFacilityDetails));

export default router;
