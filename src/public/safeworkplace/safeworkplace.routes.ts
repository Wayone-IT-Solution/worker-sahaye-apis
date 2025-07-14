import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { SafeWorkplaceController } from "./safeworkplace.controller";
import { authenticateToken, isAdmin, isEmployer } from "../../middlewares/authMiddleware";

const {
  createSafeWorkplace,
  getAllSafeWorkplaces,
  getSafeWorkplaceById,
  updateSafeWorkplaceById,
  deleteSafeWorkplaceById,
  getSafeWorkplaceDetails
} = SafeWorkplaceController;

const router = express.Router();

router
  .get("/",
    authenticateToken,
    isAdmin,
    asyncHandler(getAllSafeWorkplaces))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getSafeWorkplaceById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateSafeWorkplaceById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteSafeWorkplaceById))
  .post("/",
    authenticateToken,
    isEmployer,
    asyncHandler(createSafeWorkplace))
  .patch("/",
    authenticateToken,
    isEmployer,
    asyncHandler(getSafeWorkplaceDetails));

export default router;
