import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ForumCommentController } from "./forumcomment.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const router = express.Router();

router.get(
  "/:postId",
  asyncHandler(ForumCommentController.getCommentsByPostId)
);
router.post(
  "/",
  authenticateToken,
  asyncHandler(ForumCommentController.createForumComment)
);
router.delete(
  "/:id",
  authenticateToken,
  asyncHandler(ForumCommentController.deleteForumCommentById)
);
export default router;
