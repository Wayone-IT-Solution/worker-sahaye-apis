import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { PostEngagementController } from "./postengagement.controller";

const {
  likePost,
  sharePost,
  unlikePost,
  getPostLikes,
  getPostShares,
  deletePostShare,
} = PostEngagementController;

const router = express.Router();

// ---------- Likes ----------
router.post("/like", authenticateToken, asyncHandler(likePost));
router.get("/like/:postId", authenticateToken, asyncHandler(getPostLikes));
router.delete("/like/:postId", authenticateToken, asyncHandler(unlikePost));

// ---------- Shares ----------
router.post("/share", authenticateToken, asyncHandler(sharePost));
router.get("/share/:postId", authenticateToken, asyncHandler(getPostShares));
router.delete("/share/:id", authenticateToken, asyncHandler(deletePostShare));

export default router;
