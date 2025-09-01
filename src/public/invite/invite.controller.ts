import ApiError from "../../utils/ApiError";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { Invite } from "../../modals/invite.model";
import { Request, Response, NextFunction } from "express";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { sendDualNotification } from "../../services/notification.service";

export const InviteController = {
  async sendInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const inviter = (req as any).user.id;
      const { invitee, message, context } = req.body;

      if (inviter === invitee) {
        return res.status(400).json(new ApiError(400, "Cannot invite yourself"));
      }

      // check active plan once
      const enrolledPlan = await EnrolledPlan.findOne({
        user: invitee,
        status: "active",
      });

      const alreadyInvited = await Invite.findOne({ inviter, invitee });
      if (alreadyInvited) {
        return res
          .status(200)
          .json(new ApiResponse(200, alreadyInvited, "Invite already sent"));
      }

      const invite = await Invite.create({
        inviter,
        invitee,
        message,
        context,
        status: enrolledPlan ? "accepted" : "pending",
      });

      const [senderDoc, receiverDoc] = await Promise.all([
        User.findById(inviter).select("fullName userType").lean(),
        User.findById(invitee).select("fullName userType").lean(),
      ]);
      if (senderDoc && receiverDoc) {
        await sendDualNotification({
          type: "invite-prospective",
          context: {
            userName: senderDoc.fullName,
            prospectName: receiverDoc.fullName,
          },
          senderId: inviter,
          receiverId: invitee,
          senderRole: senderDoc.userType,
          receiverRole: receiverDoc.userType,
        });
      }

      return res
        .status(201)
        .json(new ApiResponse(201, invite, "Invite sent successfully"));
    } catch (err) {
      next(err);
    }
  },

  async getReceivedInvites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      // check active plan once
      const enrolledPlan = await EnrolledPlan.findOne({
        user: userId,
        status: "active",
      });

      const invites = await Invite.find({ invitee: userId })
        .populate("inviter", "fullName userType email")
        .sort({ createdAt: -1 });

      // add flag in each invite object
      const updatedInvites = invites.map((invite: any) => ({
        ...invite.toObject(),
        hasActivePlan: !!enrolledPlan, // true if active plan exists
      }));

      return res
        .status(200)
        .json(new ApiResponse(200, updatedInvites, "Received invites fetched"));
    } catch (err) {
      next(err);
    }
  },

  async getSentInvites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const enrolledPlan = await EnrolledPlan.findOne({
        user: userId,
        status: "active",
      });

      const invites = await Invite.find({ inviter: userId })
        .populate("invitee", "fullName userType email")
        .sort({ createdAt: -1 });

      // add flag in each invite object
      const updatedInvites = invites.map((invite: any) => ({
        ...invite.toObject(),
        hasActivePlan: !!enrolledPlan,
      }));

      return res
        .status(200)
        .json(new ApiResponse(200, updatedInvites, "Sent invites fetched"));
    } catch (err) {
      next(err);
    }
  },

  async deleteInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const { inviteId } = req.params;
      const userId = (req as any).user.id;

      const invite = await Invite.findOneAndDelete({
        _id: inviteId,
        $or: [{ inviter: userId }, { invitee: userId }],
      });

      if (!invite)
        return res.status(404).json(new ApiError(404, "Invite not found"));

      return res
        .status(200)
        .json(new ApiResponse(200, invite, "Invite deleted successfully"));
    } catch (err) {
      next(err);
    }
  },
};
