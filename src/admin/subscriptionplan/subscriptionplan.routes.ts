import express from "express";
import multer from "multer";
import { asyncHandler } from "../../utils/asyncHandler";
import { SubscriptionplanController } from "./subscriptionplan.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createSubscriptionplan,
  getAllSubscriptionplans,
  getSubscriptionplanById,
  updateSubscriptionplanById,
  deleteSubscriptionplanById,
  getPlansByUserType,
  getPlansGroupedByUserType,
  getRecommendedPlans,
  getPopularPlans,
  updatePlanFeatures,
  togglePlanStatus,
  compairPlansByUserType,
} = SubscriptionplanController;

// Setup multer for file uploads (memory storage for direct processing)
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
  },
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const router = express.Router();

// Public routes - accessible to all authenticated users
router.get("/",  asyncHandler(getAllSubscriptionplans)); // Allow all authenticated users to view plans
router.get("/recommended", authenticateToken, asyncHandler(getRecommendedPlans));
router.get("/popular", authenticateToken, asyncHandler(getPopularPlans));
router.get("/user-type/:userType", asyncHandler(getPlansByUserType));
router.get("/plans/:userType", asyncHandler(getPlansGroupedByUserType));
router.get("/compair/:userType", asyncHandler(compairPlansByUserType));

// Admin-only routes
router.post("/", authenticateToken, isAdmin, upload.single("planImage"), asyncHandler(createSubscriptionplan));
router.get("/:id", authenticateToken, isAdmin, asyncHandler(getSubscriptionplanById));
router.put("/:id", authenticateToken, isAdmin, upload.single("planImage"), asyncHandler(updateSubscriptionplanById));
router.delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteSubscriptionplanById));

// Feature management routes
router.put("/:id/features", authenticateToken, isAdmin, asyncHandler(updatePlanFeatures));
router.patch("/:id/toggle-status", authenticateToken, isAdmin, asyncHandler(togglePlanStatus));

export default router;
