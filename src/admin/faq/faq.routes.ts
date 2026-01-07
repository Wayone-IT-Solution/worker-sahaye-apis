import express from "express";
import { FaqController } from "./faq.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  // FAQ methods
  createFaq,
  getAllFaqsAdmin,
  getFaqById,
  updateFaqById,
  deleteFaqById,
  getUserFaqs,
  getUserFaqById,
  getUserFaqsByCategory,
  
  // FAQ Category methods
  createFaqCategory,
  getAllFaqCategories,
  getFaqCategoryById,
  updateFaqCategoryById,
  deleteFaqCategoryById,
} = FaqController;

const router = express.Router();

/**
 * ✅ FAQ ADMIN ROUTES (CRUD)
 */

// Create FAQ
router.post("/", authenticateToken, isAdmin, asyncHandler(createFaq));

// Get all FAQs (Admin view - no filtering)
router.get("/admin/all", authenticateToken, isAdmin, asyncHandler(getAllFaqsAdmin));

// Get FAQ by ID (Admin view)
router.get("/admin/:id", authenticateToken, isAdmin, asyncHandler(getFaqById));

// Update FAQ
router.put("/:id", authenticateToken, isAdmin, asyncHandler(updateFaqById));

// Delete FAQ
router.delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteFaqById));

/**
 * ✅ FAQ CATEGORY ADMIN ROUTES (CRUD)
 */

// Create FAQ Category
router.post("/category", authenticateToken, isAdmin, asyncHandler(createFaqCategory));

// Get all FAQ Categories
router.get("/category/admin/all", authenticateToken, isAdmin, asyncHandler(getAllFaqCategories));

// Get FAQ Category by ID
router.get("/category/admin/:id", authenticateToken, isAdmin, asyncHandler(getFaqCategoryById));

// Update FAQ Category
router.put("/category/:id", authenticateToken, isAdmin, asyncHandler(updateFaqCategoryById));

// Delete FAQ Category
router.delete("/category/:id", authenticateToken, isAdmin, asyncHandler(deleteFaqCategoryById));

/**
 * ✅ USER ROUTES (Filtered view - PUBLIC, no authentication required)
 * Query parameters:
 * - userType: "worker", "contractor", "employer", or "all"
 *   Example: GET /api/faq?userType=worker
 */

// Get FAQs filtered by user type (PUBLIC)
router.get("/", asyncHandler(getUserFaqs));

// Get FAQ by ID (User view - with visibility check) (PUBLIC)
router.get("/user/:id", asyncHandler(getUserFaqById));

// Get FAQs by category (User view - with visibility check) (PUBLIC)
router.get("/user/category/:categoryId", asyncHandler(getUserFaqsByCategory));

export default router;
