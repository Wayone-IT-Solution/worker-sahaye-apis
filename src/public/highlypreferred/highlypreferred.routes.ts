import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HighlyPreferredController } from "./highlypreferred.controller";
import { allowAllExcept, authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

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
  .get("/",
    authenticateToken,
    isAdmin,
    asyncHandler(getAllHighlyPreferreds))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getHighlyPreferredById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateHighlyPreferredById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteHighlyPreferredById))
  .post("/",
    authenticateToken,
    allowAllExcept(["admin", "agent"] as any),
    asyncHandler(createHighlyPreferred))
  .patch("/",
    authenticateToken,
    allowAllExcept(["admin", "agent"] as any),
    asyncHandler(getHighlyPreferredDetails));

export default router;
