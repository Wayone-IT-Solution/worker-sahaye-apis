import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ForumPostController } from "./forumpost.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";

const {
  getAllPosts,
  createForumPost,
  getForumPostById,
  getAllForumPosts,
  removeForumPostById,
  createaForumPostByAdmin,
  getAllGeneralForumPosts,
} = ForumPostController;

const router = express.Router();

router
  .post(
    "/",
    authenticateToken,
    dynamicUpload([{ name: "attachments", maxCount: 5 }]),
    s3UploaderMiddleware("posts"),
    asyncHandler(createForumPost)
  )
  .post(
    "/admin/create",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "attachments", maxCount: 5 }]),
    s3UploaderMiddleware("posts"),
    asyncHandler(createaForumPostByAdmin)
  )
  .get("/", authenticateToken, asyncHandler(getAllPosts))
  .get("/:postId", authenticateToken, asyncHandler(getForumPostById))
  .patch("/", authenticateToken, asyncHandler(getAllGeneralForumPosts))
  .get("/community/:id", authenticateToken, asyncHandler(getAllForumPosts))
  .delete("/:postId", authenticateToken, asyncHandler(removeForumPostById));

export default router;
