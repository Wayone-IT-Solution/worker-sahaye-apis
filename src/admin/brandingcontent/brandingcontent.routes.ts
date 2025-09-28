import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { BrandingContentController } from "./brandingcontent.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  getBrandingContent,
  upsertBrandingContent,
} = BrandingContentController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getBrandingContent))
  .post("/", authenticateToken, isAdmin, asyncHandler(upsertBrandingContent));

export default router;
