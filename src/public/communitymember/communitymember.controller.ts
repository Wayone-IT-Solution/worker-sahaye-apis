import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import {
  JoinSource,
  MemberStatus,
  CommunityMember,
} from "../../modals/communitymember.model";
import { User } from "../../modals/user.model";
import { ForumPost } from "../../modals/forumpost.model";
import { ForumComment } from "../../modals/forumcomment.model";
import { Community, CommunityPrivacy } from "../../modals/community.model";

const CommunityMemberService = new CommonService(CommunityMember);

export const resetStats = async (communityId: string) => {
  const community = await Community.findById(communityId);
  if (!community) {
    throw new Error("Community not found");
  }
  const totalPosts = await ForumPost.countDocuments({ community: communityId });
  const totalComments = await ForumComment.countDocuments({
    community: communityId,
  });
  const totalMembers = await CommunityMember.countDocuments({
    community: communityId,
  });
  const activeMembers = await CommunityMember.countDocuments({
    community: communityId,
    status: MemberStatus.JOINED,
  });
  community.stats = {
    totalPosts,
    totalMembers,
    totalComments,
    activeMembers,
  };
  await community.save();
};

export class CommunityMemberController {
  static async createCommunityMember(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { community, invitedBy } = req.body;
      const { id: user, role: userType } = (req as any).user;

      const userExist = await User.findById(user);
      if (!userExist)
        return res.status(404).json(new ApiError(404, "User not found"));
      if (userExist.status !== "active")
        return res.status(403).json(new ApiError(403, "User is not active"));

      const communityExist = await Community.findById(community);
      if (!communityExist)
        return res.status(404).json(new ApiError(404, "Community not found"));
      if (communityExist.status !== "active")
        return res
          .status(403)
          .json(new ApiError(403, "Community is not active"));

      const existingMember = await CommunityMember.findOne({ user, community });
      if (!existingMember) {
        const isPublic = communityExist.privacy === CommunityPrivacy.PUBLIC;
        const memberData = {
          user,
          userType,
          invitedBy,
          community,
          joinedAt: isPublic ? new Date() : undefined,
          joinSource: invitedBy ? JoinSource.INVITE : JoinSource.DIRECT,
          status: isPublic ? MemberStatus.JOINED : MemberStatus.PENDING,
        };

        const result = await CommunityMemberService.create(memberData);
        await resetStats(community);
        if (!result)
          return res
            .status(400)
            .json(new ApiError(400, "Failed to add member to community"));
        return res
          .status(201)
          .json(
            new ApiResponse(201, result, "Successfully joined the community")
          );
      }
      if (existingMember.status === MemberStatus.REMOVED) {
        const isPublic = communityExist.privacy === CommunityPrivacy.PUBLIC;
        existingMember.joinedAt = isPublic ? new Date() : undefined;
        existingMember.joinSource = invitedBy
          ? JoinSource.INVITE
          : JoinSource.DIRECT;
        existingMember.status = isPublic
          ? MemberStatus.JOINED
          : MemberStatus.PENDING;
        const result = await existingMember.save();
        await resetStats(community);
        if (!result)
          return res
            .status(400)
            .json(new ApiError(400, "Failed to add member to community"));
        return res
          .status(201)
          .json(
            new ApiResponse(201, result, "Successfully joined the community")
          );
      }
      if (existingMember.status === MemberStatus.BLOCKED)
        return res
          .status(403)
          .json(new ApiError(403, "User is blocked from the community"));

      if (existingMember.status === MemberStatus.JOINED)
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              existingMember,
              "User is already a member of the community"
            )
          );
    } catch (err) {
      next(err);
    }
  }

  static async getAllCommunityMembers(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$user" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$refId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "userByProfile",
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
        { $unwind: "$communityDetails" },
        {
          $project: {
            _id: 1,
            status: 1,
            userType: 1,
            joinedAt: 1,
            createdAt: 1,
            updatedAt: 1,
            joinSource: 1,
            "userDetails.email": 1,
            "userDetails.mobile": 1,
            "userDetails.fullName": 1,
            "communityDetails.name": 1,
            "communityDetails.profileImage": 1,
            "userByProfile": { $arrayElemAt: ["$userByProfile.url", 0] },
          },
        },
      ];
      const result = await CommunityMemberService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async removeCommunityMemberById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { community } = req.body;
      const { id: user } = (req as any).user;
      const member = await CommunityMember.findOne({ user, community });
      if (!member)
        return res
          .status(404)
          .json(new ApiError(404, "You are not a member of this community!"));

      if (
        member.status === MemberStatus.PENDING ||
        member.status === MemberStatus.JOINED
      ) {
        member.status = MemberStatus.REMOVED;
        const updatedMember = await member.save();
        await resetStats(community);
        if (!updatedMember)
          return res
            .status(500)
            .json(
              new ApiError(500, "Failed to update community member status")
            );
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              updatedMember,
              "Community member removed successfully"
            )
          );
      }
      return res
        .status(400)
        .json(new ApiError(400, "Community member cannot be removed"));
    } catch (err) {
      next(err);
    }
  }

  static async getMembersByCommunityId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { communityId } = req.params;

      const communityExists = await Community.findById(communityId);
      if (!communityExists)
        return res.status(404).json(new ApiError(404, "Community not found"));


      const pipeline = [{
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $lookup: {
          from: "fileuploads",
          let: { userId: "$userDetails._id" },
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
          status: 1,
          userType: 1,
          joinedAt: 1,
          invitedAt: 1,
          joinSource: 1,
          userEmail: "$userDetails.email",
          userName: "$userDetails.fullName",
          userMobile: "$userDetails.mobile",
          profilePicUrl: "$profilePicFile.url",
        },
      },]

      const members = await CommunityMemberService.getAll({ ...req.query, status: req.query.status ?? "joined", community: communityId }, pipeline);
      return res.status(200).json(
        new ApiResponse(200, members, "Community members fetched successfully")
      );
    } catch (err) {
      next(err);
    }
  }
}
