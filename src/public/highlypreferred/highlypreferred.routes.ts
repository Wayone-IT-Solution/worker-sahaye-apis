import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HighlyPreferredController } from "./highlypreferred.controller";
import { authenticateToken, isAdmin, isEmployer } from "../../middlewares/authMiddleware";

const {
  createHighlyPreferred,
  getAllHighlyPreferreds,
  getHighlyPreferredById,
  updateHighlyPreferredById,
  deleteHighlyPreferredById,
  getHighlyPreferredDetails
} = HighlyPreferredController;

const router = express.Router();

router
  .get("/:userType",
    authenticateToken,
    isAdmin,
    asyncHandler(getAllHighlyPreferreds))
  .get("/:userType/:id", authenticateToken, isAdmin, asyncHandler(getHighlyPreferredById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateHighlyPreferredById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteHighlyPreferredById))
  .post("/",
    authenticateToken,
    isEmployer,
    asyncHandler(createHighlyPreferred))
  .patch("/",
    authenticateToken,
    isEmployer,
    asyncHandler(getHighlyPreferredDetails));

export default router;
