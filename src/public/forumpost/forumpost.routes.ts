import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ForumPostController } from "./forumpost.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";

const {
  createForumPost,
  getForumPostById,
  getAllForumPosts,
  removeForumPostById,
  getAllGeneralForumPosts,
} = ForumPostController;

const router = express.Router();

router
  .post(
    "/",
    dynamicUpload([{ name: "files", maxCount: 5 }]),
    s3UploaderMiddleware("posts"),
    authenticateToken,
    asyncHandler(createForumPost)
  )
  .get("/:postId", authenticateToken, asyncHandler(getForumPostById))
  .patch("/", authenticateToken, asyncHandler(getAllGeneralForumPosts))
  .get("/community/:id", authenticateToken, asyncHandler(getAllForumPosts))
  .delete("/:postId", authenticateToken, asyncHandler(removeForumPostById));

export default router;
