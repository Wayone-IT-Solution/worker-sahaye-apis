import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import { startOfDay, endOfDay } from "date-fns";
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
import { EnrolledPlan, PlanEnrollmentStatus } from "../../modals/enrollplan.model";
import { ISubscriptionPlan, PlanType } from "../../modals/subscriptionplan.model";

const hiringPatterns: RegExp[] = [
  /h[!1i¡]*r[!1i¡]*[e3a@u][!1i¡]*[n9gq]/i,                       // hiring, h1ring, h!ring, h¡ring
  /recru[i1!¡][t+]{1,2}[me3]n[t+]{0,1}/i,                        // recruitment, recru1tment, recru!tment
  /apply\s+(now|today)?/i,
  /job\s+(opening|opportunity|alert|role|description)/i,
  /career\s+(opportunity|fair)/i,
  /\b(vacanc(y|ies)|openings?|position\s+open)\b/i,
  /urgent\s+hiring/i,
  /interview\s+(drive|schedule|tips|walk[- ]?in)/i,
  /placement\s+(drive|event)/i,
  /submit\s+(your\s+)?resume/i,
  /we\s+are\s+hiring/i,
  /\bremote\s+job\b/i,
  /work\s+with\s+us/i,
  /join\s+(our\s+)?team/i,
  /looking\s+for\s+(candidates|talent)/i,
  /staffing|freelancer\s+needed|get\s+hired/i,
  /\btalent\s+acquisition\b/i,
  /experienced\s+candidates?|fresher\s+welcome/i,
  /send\s+(your\s+)?resume/i
];
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

      // If contractor, enforce subscription plan: only GROWTH or ENTERPRISE can post
      if (userType === UserType.CONTRACTOR || userType === UserType.EMPLOYER) {
        const enrolled = await EnrolledPlan.findOne({ user, status: PlanEnrollmentStatus.ACTIVE }).populate<{ plan: ISubscriptionPlan }>("plan");
        const planType = (enrolled?.plan as ISubscriptionPlan | undefined)?.planType as PlanType | undefined;
        if (!enrolled || planType === PlanType.FREE || planType === PlanType.BASIC) {
          if (attachments && attachments.length > 0) {
            attachments.map(async (file: any) => {
              await extractImageUrl(file);
            });
          }
          return res.status(403).json(new ApiError(403, "Your subscription plan does not allow creating forum posts"));
        }
      }

      // Check if user has already posted today
      const todayEnd = endOfDay(new Date());
      const todayStart = startOfDay(new Date());
      const alreadyPosted = await ForumPost.findOne({
        createdBy: communityMember?._id,
        createdAt: { $gte: todayStart, $lte: todayEnd },
      });
      if (alreadyPosted) {
        if (attachments && attachments.length > 0) {
          attachments.map(async (file: any) => {
            await extractImageUrl(file);
          });
        }
        return res
          .status(429)
          .json(new ApiError(429, "You can only create one forum post per day."));
      }

      const handleValidation = (
        title: string,
        content: string,
        tags: string[]
      ): boolean => {
        const combined = `${title} ${content} ${Array.isArray(tags) ? tags.join(" ") : tags}`.toLowerCase();
        return hiringPatterns.some((pattern) => pattern.test(combined));
      };

      const { title, content, tags, community } = req.body;
      const isBlocked = handleValidation(title, content, tags)
      const data: any = {
        tags: typeof tags === "string" ? tags.split(",") : tags,
        title,
        content,
        community,
        attachments: attachments?.map((file: any, index: number) => ({
          order: index,
          url: file.url,
          s3Key: file.url.split(".com/")[1],
        })),
        createdBy: communityMember?._id,
        status: isBlocked ? "hiring_content" : "active",
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
      const skip = (page - 1) * limit;

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
      const { id: user, role } = (req as any).user;
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
      const result = await ForumPostService.getAll({ ...req.query, ...(role === "admin" ? {} : { createdBy: user }) }, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllMyPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: user, role } = (req as any).user;

      const pipeline: any[] = [
        // Lookup community details
        {
          $lookup: {
            from: "communities",
            localField: "community",
            foreignField: "_id",
            as: "communityDetails",
          },
        },
        { $unwind: "$communityDetails" },

        // Lookup member details
        {
          $lookup: {
            from: "communitymembers",
            localField: "createdBy",
            foreignField: "_id",
            as: "memberDetails",
          },
        },
        {
          $unwind: {
            path: "$memberDetails",
            preserveNullAndEmptyArrays: true,
          },
        },

        // Lookup user details
        {
          $lookup: {
            from: "users",
            localField: "memberDetails.user",
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

        // Step 2: Apply filter for non-admins (inside pipeline)
        ...([
          {
            $match: {
              "memberDetails.user": new mongoose.Types.ObjectId(user),
            },
          },
        ]),

        // Add creator details
        {
          $addFields: {
            creatorEmail: "$userData.email",
            creatorMobile: "$userData.mobile",
            creatorName: "$userData.fullName",
          },
        },

        // Projection
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
            creatorMobile: 1,
            commentsCount: 1,
            "communityDetails.name": 1,
          },
        },
      ];

      // Step 3: Call service
      const filters: any = { ...req.query };
      const result = await ForumPostService.getAll(filters, pipeline);

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
