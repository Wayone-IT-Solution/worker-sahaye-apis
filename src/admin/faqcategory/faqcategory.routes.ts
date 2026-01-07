import express from "express";
import { FaqCategoryController } from "./faqcategory.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createFaqCategory,
  getAllFaqCategories,
  getFaqCategoryById,
  updateFaqCategoryById,
  deleteFaqCategoryById,
} = FaqCategoryController;

const router = express.Router();

// Admin Routes - CRUD operations
router
  .post("/", authenticateToken, isAdmin, asyncHandler(createFaqCategory))
  .get("/", authenticateToken, asyncHandler(getAllFaqCategories))
  .get("/:id", authenticateToken, asyncHandler(getFaqCategoryById))
  .put("/:id", authenticateToken, isAdmin, asyncHandler(updateFaqCategoryById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteFaqCategoryById));

export default router;
