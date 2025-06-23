import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { FeatureController } from "./feature.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const {
  createFeature,
  getAllFeatures,
  getFeatureById,
  deleteFeatureById,
  updateFeatureById,
} = FeatureController;

const router = express.Router();

router.get("/", authenticateToken, asyncHandler(getAllFeatures));
router.post("/", authenticateToken, asyncHandler(createFeature));
router.get("/:id", authenticateToken, asyncHandler(getFeatureById));
router.put("/:id", authenticateToken, asyncHandler(updateFeatureById));
router.delete("/:id", authenticateToken, asyncHandler(deleteFeatureById));

export default router;
