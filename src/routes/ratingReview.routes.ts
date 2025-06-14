import { Router } from "express";
import {
  createRatingReview,
  getAllRatingReviews,
  getRatingReviewById,
  updateAdminAction,
} from "../controllers/ratingReview.controller";
import {
  isAdmin,
  isPassenger,
  authenticateToken,
} from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// 🚀 Passenger route: Create rating & review
router.post(
  "/",
  authenticateToken,
  isPassenger,
  asyncHandler(createRatingReview)
);

// 🛡 Admin routes
router.use(authenticateToken, isAdmin);

router.route("/").get(asyncHandler(getAllRatingReviews));
router.route("/:id").get(asyncHandler(getRatingReviewById));
router.patch("/:id/admin-action", asyncHandler(updateAdminAction));

export default router;
