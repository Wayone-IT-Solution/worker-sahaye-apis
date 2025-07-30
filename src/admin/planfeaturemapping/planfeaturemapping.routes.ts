import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { PlanFeatureMappingController } from "./planfeaturemapping.controller";
import { authenticateToken, isAdmin, isWorker } from "../../middlewares/authMiddleware";

const {
  getAmountByUserType,
  createPlanFeatureMapping,
  getAllPlanFeatureMappings,
  getPlanFeatureMappingById,
  updatePlanFeatureMappingById,
  deletePlanFeatureMappingById,
} = PlanFeatureMappingController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllPlanFeatureMappings))
  .post("/", authenticateToken, isAdmin, asyncHandler(createPlanFeatureMapping))
  .get("/assistant", authenticateToken, isWorker, asyncHandler(getAmountByUserType))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getPlanFeatureMappingById))
  .put(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updatePlanFeatureMappingById)
  )
  .delete(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(deletePlanFeatureMappingById)
  );

export default router;
