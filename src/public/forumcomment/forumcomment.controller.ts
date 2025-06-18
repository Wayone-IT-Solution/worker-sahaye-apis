import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { ForumComment } from "../../modals/forumcomment.model";
import { updatePostStatsById } from "../postengagement/postengagement.controller";

export class ForumCommentController {
  static async createForumComment(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { post, content } = req.body;
      const user = (req as any).user.id;

      const comment = await ForumComment.create({
        post,
        user,
        content,
      });
      await updatePostStatsById(post);
      return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteForumCommentById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const commentId = req.params.id;
      const userId = (req as any).user.id;

      const comment = await ForumComment.findById(commentId);
      if (!comment) {
        return res.status(404).json(new ApiError(404, "Comment not found"));
      }

      if (comment.user.toString() !== userId) {
        return res
          .status(403)
          .json(new ApiError(403, "Unauthorized to delete this comment"));
      }

      await comment.deleteOne();
      await updatePostStatsById(comment.post.toString());

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Comment deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getCommentsByPostId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const postId = req.params.postId;
      const comments = await ForumComment.find({ post: postId })
        .populate("user", "name email")
        .sort({ createdAt: -1 });

      return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
    } catch (err) {
      next(err);
    }
  }
}
