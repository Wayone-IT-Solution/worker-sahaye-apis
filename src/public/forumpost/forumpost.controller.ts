import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { UserType } from "../../modals/user.model";
import { deleteFromS3 } from "../../config/s3Uploader";
import { ForumPost } from "../../modals/forumpost.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import {
  CommunityMember,
  MemberStatus,
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
      const { id: user, role: userType } = (req as any).user;
      if (userType === UserType.WORKER) {
        const { files } = req.body;
        if (files && files.length > 0) {
          files.map(async (file: any) => {
            await extractImageUrl(file);
          });
        }
        return res
          .status(403)
          .json(new ApiError(403, "Workers cannot create forum posts"));
      }

      if (!req.body.community)
        return res
          .status(400)
          .json(new ApiError(400, "Community ID is required"));

      const communityMember = await CommunityMember.findOne({
        user: user,
        status: "joined",
        userType: userType,
        community: req.body.community,
      });
      if (!communityMember)
        return res
          .status(400)
          .json(new ApiError(400, "User is not a member of the community"));

      const { title, content, tags, community, files } = req.body;
      const data: any = {
        tags,
        title,
        content,
        community,
        attachments: files?.map((file: any, index: number) => ({
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

      const pipeline = [
        {
          $lookup: {
            from: "communitymembers",
            localField: "createdBy",
            foreignField: "_id",
            as: "creatorMemberDetails",
          },
        },
        { $unwind: "$creatorMemberDetails" },
        {
          $lookup: {
            from: "users",
            localField: "creatorMemberDetails.user",
            foreignField: "_id",
            as: "creatorUserDetails",
          },
        },
        { $unwind: "$creatorUserDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$creatorMemberDetails.user" },
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
            profilePicUrl: "$profilePicFile.url",
            creatorName: "$creatorUserDetails.fullName",
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
        {
          $lookup: {
            from: "communitymembers",
            localField: "createdBy",
            foreignField: "_id",
            as: "creatorMemberDetails",
          },
        },
        { $unwind: "$creatorMemberDetails" },
        {
          $lookup: {
            from: "users",
            localField: "creatorMemberDetails.user",
            foreignField: "_id",
            as: "creatorUserDetails",
          },
        },
        { $unwind: "$creatorUserDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$creatorMemberDetails.user" },
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
            profilePicUrl: "$profilePicFile.url",
            creatorName: "$creatorUserDetails.fullName",
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

  static async removeForumPostById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { postId } = req.params;
      const { id: user } = (req as any).user;
      const post = await ForumPostService.getById(postId);
      if (!post)
        return res.status(404).json(new ApiError(404, "Post not found"));

      const communityMember = await CommunityMember.findOne({
        user: user,
        status: "joined",
        community: post.community,
        userType: (req as any).user.role,
      });
      if (communityMember) {
        if (post.attachments && post.attachments.length > 0) {
          await Promise.all(
            post.attachments.map(async (attachment: any) => {
              await deleteFromS3(attachment.s3Key);
            })
          );
        }
        const deletedPost = await ForumPostService.deleteById(postId);
        await resetStats(post.community.toString());
        return res
          .status(200)
          .json(
            new ApiResponse(200, deletedPost, "Forum post deleted successfully")
          );
      }
    } catch (err) {
      next(err);
    }
  }
}
