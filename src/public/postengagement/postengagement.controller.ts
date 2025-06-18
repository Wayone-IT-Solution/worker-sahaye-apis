import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { ForumPost } from "../../modals/forumpost.model";
import { Request, Response, NextFunction } from "express";
import { ForumComment } from "../../modals/forumcomment.model";
import { PostLike, PostShare } from "../../modals/postengagement.model";

/**
 * Recalculates and updates the like, share, and comment counts for a specific forum post.
 * @param postId The ID of the forum post to update stats for
 * @returns Updated post document or null if not found
 */
export const updatePostStatsById = async (postId: string) => {
  try {
    const [likes, shares, comments] = await Promise.all([
      PostLike.countDocuments({ post: postId }),
      PostShare.countDocuments({ post: postId }),
      ForumComment.countDocuments({ post: postId }),
    ]);

    const updatedPost = await ForumPost.findByIdAndUpdate(
      postId,
      {
        $set: {
          likes,
          shares,
          commentsCount: comments,
        },
      },
      { new: true }
    );
    return updatedPost;
  } catch (error) {
    console.error("Failed to update post stats:", error);
    throw error;
  }
};

export class PostEngagementController {
  static async likePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { post } = req.body;
      const likedBy = (req as any).user.id;

      const alreadyLiked = await PostLike.findOne({ post, likedBy });
      if (alreadyLiked) {
        return res
          .status(200)
          .json(new ApiResponse(200, alreadyLiked, "Post already liked"));
      }

      const like = await PostLike.create({
        post,
        likedBy,
        likedAt: new Date(),
      });
      await updatePostStatsById(post);
      return res
        .status(201)
        .json(new ApiResponse(201, like, "Post liked successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async unlikePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params;
      const likedBy = (req as any).user.id;

      const result = await PostLike.findOneAndDelete({ post: postId, likedBy });
      if (!result) {
        return res.status(404).json(new ApiError(404, "Like not found"));
      }

      await updatePostStatsById(postId);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Post unliked successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPostLikes(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params;
      const likes = await PostLike.find({ post: postId }).populate(
        "likedBy",
        "name email"
      );
      return res
        .status(200)
        .json(new ApiResponse(200, likes, "Likes fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  // -------------------- SHARE ------------------------

  static async sharePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { post, sharedTo } = req.body;
      const sharedBy = (req as any).user.id;

      const share = await PostShare.create({
        post,
        sharedBy,
        sharedTo,
        sharedAt: new Date(),
      });
      await updatePostStatsById(post);

      return res
        .status(201)
        .json(new ApiResponse(201, share, "Post shared successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPostShares(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params;
      const shares = await PostShare.find({ post: postId })
        .populate("sharedBy", "name email")
        .populate("sharedTo", "name email");

      return res
        .status(200)
        .json(new ApiResponse(200, shares, "Shares fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deletePostShare(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const result = await PostShare.findByIdAndDelete(id);

      if (!result) {
        return res.status(404).json(new ApiError(404, "Share not found"));
      }
      await updatePostStatsById(result.post.toString());
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Post share deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
