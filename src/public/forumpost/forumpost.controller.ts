import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { UserType } from "../../modals/user.model";
import { deleteFromS3 } from "../../config/s3Uploader";
import { ForumPost } from "../../modals/forumpost.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import {
  MemberStatus,
  CommunityMember,
} from "../../modals/communitymember.model";
import { resetStats } from "../communitymember/communitymember.controller";

const ForumPostService = new CommonService(ForumPost);

export const extractImageUrl = async (input: any) => {
  const newUrl = input?.url;
  const s3Key = newUrl.split(".com/")[1];
  await deleteFromS3(s3Key);
};

export class ForumPostController {
  static async createForumPost(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { attachments } = req.body;
      const { id: user, role: userType } = (req as any).user;
      if (userType === UserType.WORKER) {
        if (attachments && attachments.length > 0) {
          attachments.map(async (file: any) => {
            await extractImageUrl(file);
          });
        }
        return res
          .status(403)
          .json(new ApiError(403, "Workers cannot create forum posts"));
      }

      if (!req.body.community) {
        if (attachments && attachments.length > 0) {
          attachments.map(async (file: any) => {
            await extractImageUrl(file);
          });
        }
        return res
          .status(400)
          .json(new ApiError(400, "Community ID is required"));
      }

      const communityMember = await CommunityMember.findOne({
        user: user,
        status: "joined",
        userType: userType,
        community: req.body.community,
      });
      if (!communityMember) {
        if (attachments && attachments.length > 0) {
          attachments.map(async (file: any) => {
            await extractImageUrl(file);
          });
        }
        return res
          .status(400)
          .json(new ApiError(400, "User is not a member of the community"));
      }

      const { title, content, tags, community } = req.body;
      const data: any = {
        tags,
        title,
        content,
        community,
        attachments: attachments?.map((file: any, index: number) => ({
          order: index,
          url: file.url,
          s3Key: file.url.split(".com/")[1],
        })),
        createdBy: communityMember?._id,
      };
      const result = await ForumPostService.create(data);
      await resetStats(community.toString());
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Forum post could not be created"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Forum post created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async createaForumPostByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { attachments } = req.body;
      const { id: user } = (req as any).user;

      if (!req.body.community) {
        if (attachments && attachments.length > 0) {
          attachments.map(async (file: any) => {
            await extractImageUrl(file);
          });
        }
        return res
          .status(400)
          .json(new ApiError(400, "Community ID is required"));
      }

      const { title, content, tags, community } = req.body;
      if (typeof tags === "string") req.body.tags = tags.split(",");

      const data: any = {
        tags,
        title,
        content,
        community,
        attachments: attachments?.map((file: any, index: number) => ({
          order: index,
          url: file.url,
          s3Key: file.url.split(".com/")[1],
        })),
        postedByAdmin: user,
      };
      const result = await ForumPostService.create(data);
      await resetStats(community.toString());
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Forum post could not be created"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Forum post created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllForumPosts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.params.id)
        return res
          .status(400)
          .json(new ApiError(400, "Community ID is required"));

      if ((req as any).user.role !== "admin") {
        const communityMember = await CommunityMember.findOne({
          community: req.params.id,
          user: (req as any).user.id,
          status: MemberStatus.JOINED,
          userType: (req as any).user.role,
        });
        if (!communityMember)
          return res
            .status(400)
            .json(new ApiError(400, "User is not a member of the community"));
      }

      const pipeline = [
        {
          $addFields: {
            isAdminPost: { $cond: [{ $ifNull: ["$postedByAdmin", false] }, true, false] },
          },
        },
        {
          $lookup: {
            from: "communitymembers",
            localField: "createdBy",
            foreignField: "_id",
            as: "creatorMemberDetails",
          },
        },
        {
          $unwind: {
            path: "$creatorMemberDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "creatorMemberDetails.user",
            foreignField: "_id",
            as: "creatorUserDetails",
          },
        },
        {
          $unwind: {
            path: "$creatorUserDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "communities",
            localField: "community",
            foreignField: "_id",
            as: "communityDetails",
          },
        },
        {
          $unwind: {
            path: "$communityDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            effectiveUserId: {
              $cond: {
                if: "$isAdminPost",
                then: null,
                else: "$creatorMemberDetails.user",
              },
            },
            creatorName: {
              $cond: {
                if: "$isAdminPost",
                then: "$communityDetails.name",
                else: "$creatorUserDetails.fullName",
              },
            },
            profilePicUrl: {
              $cond: {
                if: "$isAdminPost",
                then: "$communityDetails.profileImage",
                else: "$$REMOVE", // placeholder; will be set by $lookup below
              },
            },
          },
        },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$effectiveUserId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePicFile",
          },
        },
        {
          $unwind: {
            path: "$profilePicFile",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            profilePicUrl: {
              $cond: {
                if: "$isAdminPost",
                then: "$profileImage", // already from community
                else: "$profilePicFile.url",
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            tags: 1,
            likes: 1,
            shares: 1,
            status: 1,
            content: 1,
            createdAt: 1,
            attachments: 1,
            creatorName: 1,
            commentsCount: 1,
            profilePicUrl: 1,
          },
        },
      ];

      const result = await ForumPostService.getAll(
        {
          ...req.query,
          community: req.params.id,
        },
        pipeline
      );
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllGeneralForumPosts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const now = new Date();
      const { id: user } = (req as any).user;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit + 1;

      const joinedCommunityIds = await CommunityMember.distinct("community", {
        user,
      });

      const pipeline: any = [
        {
          $match: {
            community: { $in: joinedCommunityIds },
            status: "active",
            createdAt: { $lte: now },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },

        // Add isAdminPost flag
        {
          $addFields: {
            isAdminPost: { $cond: [{ $ifNull: ["$postedByAdmin", false] }, true, false] },
          },
        },

        // Lookup community data (for admin posts)
        {
          $lookup: {
            from: "communities",
            localField: "community",
            foreignField: "_id",
            as: "communityDetails",
          },
        },
        { $unwind: "$communityDetails" },

        // Lookup creatorMemberDetails (for user posts)
        {
          $lookup: {
            from: "communitymembers",
            localField: "createdBy",
            foreignField: "_id",
            as: "creatorMemberDetails",
          },
        },
        { $unwind: { path: "$creatorMemberDetails", preserveNullAndEmptyArrays: true } },

        // Lookup user (for user posts)
        {
          $lookup: {
            from: "users",
            localField: "creatorMemberDetails.user",
            foreignField: "_id",
            as: "creatorUserDetails",
          },
        },
        { $unwind: { path: "$creatorUserDetails", preserveNullAndEmptyArrays: true } },

        // Decide effectiveUserId only for user posts
        {
          $addFields: {
            effectiveUserId: {
              $cond: {
                if: "$isAdminPost",
                then: null,
                else: "$creatorMemberDetails.user",
              },
            },
            creatorName: {
              $cond: {
                if: "$isAdminPost",
                then: "$communityDetails.name",
                else: "$creatorUserDetails.fullName",
              },
            },
            profilePicUrl: {
              $cond: {
                if: "$isAdminPost",
                then: "$communityDetails.profileImage",
                else: "$$REMOVE", // will assign from fileuploads below
              },
            },
          },
        },

        // Lookup profilePic for user posts
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$effectiveUserId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePicFile",
          },
        },
        {
          $addFields: {
            profilePicUrl: {
              $cond: {
                if: "$isAdminPost",
                then: "$profilePicUrl",
                else: { $arrayElemAt: ["$profilePicFile.url", 0] },
              },
            },
          },
        },

        // Final projection
        {
          $project: {
            _id: 1,
            title: 1,
            tags: 1,
            likes: 1,
            shares: 1,
            status: 1,
            content: 1,
            createdAt: 1,
            attachments: 1,
            commentsCount: 1,
            profilePicUrl: 1,
            creatorName: 1,
          },
        },
      ];
      const posts = await ForumPost.aggregate(pipeline);
      const total = await ForumPost.countDocuments({
        community: { $in: joinedCommunityIds },
        status: "active",
        createdAt: { $lte: new Date() },
      });
      return res.status(200).json(
        new ApiResponse(200, {
          result: posts,
          pagination: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: total > 0 ? total - 1 : 0,
            totalPages: Math.ceil((total - 1) / limit),
          },
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async getForumPostById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await ForumPostService.getById(req.params.postId);
      if (!result)
        return res.status(404).json(new ApiError(404, "Post not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllPosts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pipeline = [
        // Lookup community details for both admin and user cases
        {
          $lookup: {
            from: "communities",
            localField: "community",
            foreignField: "_id",
            as: "communityDetails",
          },
        },
        { $unwind: "$communityDetails" },

        // Add isAdminPost flag
        {
          $addFields: {
            isAdminPost: { $cond: [{ $ifNull: ["$postedByAdmin", false] }, true, false] },
          },
        },

        // Lookup user details if not admin
        {
          $lookup: {
            from: "communitymembers",
            localField: "createdBy",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userDetails.user",
            foreignField: "_id",
            as: "userData",
          },
        },
        {
          $unwind: {
            path: "$userData",
            preserveNullAndEmptyArrays: true,
          },
        },

        // Conditionally pick name, email, mobile
        {
          $addFields: {
            creatorName: {
              $cond: {
                if: "$isAdminPost",
                then: "$communityDetails.name",
                else: "$userData.fullName",
              },
            },
            creatorEmail: {
              $cond: {
                if: "$isAdminPost",
                then: null, // or "" if you prefer empty string
                else: "$userData.email",
              },
            },
            creatorMobile: {
              $cond: {
                if: "$isAdminPost",
                then: null,
                else: "$userData.mobile",
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            tags: 1,
            likes: 1,
            title: 1,
            shares: 1,
            status: 1,
            content: 1,
            createdAt: 1,
            attachments: 1,
            creatorName: 1,
            creatorEmail: 1,
            commentsCount: 1,
            creatorMobile: 1,
            "communityDetails.name": 1,
          },
        },
      ];
      const result = await ForumPostService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async removeForumPostById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { postId } = req.params;
      const { id: userId, role } = (req as any).user;

      const post = await ForumPostService.getById(postId);
      if (!post)
        return res.status(404).json(new ApiError(404, "Post not found"));

      const isAdmin = role === "admin";

      if (isAdmin) {
        // Check if admin is the owner of the post
        if (!post.postedByAdmin || post.postedByAdmin.toString() !== userId) {
          return res
            .status(403)
            .json(new ApiError(403, "You are not authorized to delete this post"));
        }
      } else {
        // Must be a joined community member and the post creator
        const communityMember: any = await CommunityMember.findOne({
          user: userId,
          status: "joined",
          community: post.community,
        });

        if (!communityMember || post.createdBy?.toString() !== communityMember._id?.toString()) {
          return res
            .status(403)
            .json(new ApiError(403, "You are not authorized to delete this post"));
        }
      }

      // Delete attached files from S3
      if (post.attachments && post.attachments.length > 0) {
        await Promise.all(
          post.attachments.map((attachment: any) => deleteFromS3(attachment.s3Key))
        );
      }

      // Delete post & update stats
      const deletedPost = await ForumPostService.deleteById(postId);
      await resetStats(post.community.toString());

      return res
        .status(200)
        .json(new ApiResponse(200, deletedPost, "Forum post deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
