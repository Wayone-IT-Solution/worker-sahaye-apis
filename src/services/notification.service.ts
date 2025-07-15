import { NotificationMessages } from "./../config/notificationMessages";
import {
  UserType,
  Notification,
  NotificationType,
} from "../modals/notification.model";
import mongoose, { Types } from "mongoose";
import admin from "../utils/firebase";
import { config } from "../config/config";
import { User } from "../modals/user.model";
import { sendSMS } from "../utils/smsService";
import ApiResponse from "../utils/ApiResponse";
import { sendEmail } from "../utils/emailService";
import { paginationResult } from "../utils/helper";
import { Request, Response, NextFunction } from "express";

interface SendNotificationOptions {
  title: string;
  message: string;
  toUserId: string;
  toRole: UserType;
  type: NotificationType;
  fromUser?: { id: string; role: UserType };
}

interface DualNotifyOptions {
  senderId: string;
  receiverId: string;
  senderRole: UserType;
  type: NotificationType;
  receiverRole: UserType;
  context: Record<string, string | number>;
}

interface SingleNotifyOptions {
  toUserId: string;
  toRole: UserType;
  type: NotificationType;
  direction?: "sender" | "receiver";
  context: Record<string, string | number>;
  fromUser?: { id: string; role: UserType };
}

export const NotificationService = {
  async send(
    options: SendNotificationOptions,
    authUser?: { id: string; role: UserType }
  ) {
    const { type, title, message, toRole, toUserId, fromUser } = options;
    const sender = fromUser || authUser;

    if (!sender) throw new Error("Sender information is missing.");

    let notification: any;

    try {
      // Create notification
      notification = await Notification.create({
        type,
        title,
        message,
        to: { user: new Types.ObjectId(toUserId), role: toRole },
        from: { user: new Types.ObjectId(sender.id), role: sender.role },
      });

      // Fetch sender and recipient
      const [recipient, senderUser] = await Promise.all([
        User.findById(toUserId).lean(),
        sender.role !== "admin" ? User.findById(sender.id).lean() : User.findById(sender.id).lean(),
      ]);

      if (!recipient) throw new Error(`Recipient not found: ${toUserId}`);
      if (!senderUser) throw new Error(`Sender not found: ${sender.id}`);

      const preferences = recipient?.preferences?.notifications || {};
      const smsAllowed = preferences.sms !== false;
      const pushAllowed = preferences.push !== false;
      const emailAllowed = preferences.email !== false;

      const { fcmToken, mobile, email } = recipient;

      const tasks: Promise<any>[] = [];

      // --- Push Notification ---
      if (pushAllowed && fcmToken && admin) {
        tasks.push(
          admin
            .messaging()
            .send({
              token: fcmToken,
              notification: { title, body: message },
              data: {
                type,
                notificationId: notification._id.toString(),
              },
            })
            .then(() => {
              if (config.env === "development") {
                console.log(`[Notification] Push sent to userId=${toUserId}`);
              }
            })
            .catch((err) => {
              console.log(
                `[Notification Error] Push failed for userId=${toUserId}: ${err.message}`
              );
            })
        );
      }

      // --- Email Notification ---
      // if (emailAllowed && email && config.email.enabled) {
      //   tasks.push(
      //     sendEmail({
      //       to: email,
      //       subject: title,
      //       text: message,
      //       html: `<p>${message}</p>`,
      //       from: {
      //         name: senderUser.fullName || "Notification Service",
      //         email: senderUser.email || config.email.from,
      //       },
      //     })
      //       .then(() => {
      //         if (config.env === "development") {
      //           console.log(`[Notification] Email sent to ${email}`);
      //         }
      //       })
      //       .catch((err) => {
      //         console.log(
      //           `[Notification Error] Email failed for ${email}: ${err.message}`
      //         );
      //       })
      //   );
      // }

      // --- SMS Notification ---
      // if (smsAllowed && mobile && config.sms.enabled) {
      //   tasks.push(
      //     sendSMS({ to: mobile, message })
      //       .then(() => {
      //         if (config.env === "development") {
      //           console.log(`[Notification] SMS sent to ${mobile}`);
      //         }
      //       })
      //       .catch((err) => {
      //         console.log(
      //           `[Notification Error] SMS failed for ${mobile}: ${err.message}`
      //         );
      //       })
      //   );
      // }
      await Promise.all(tasks);
    } catch (err: any) {
      console.log(`[Notification Critical] ${err.message}`);
      if (!notification) throw err;
    }
    return notification;
  },
};

export async function sendDualNotification({
  type,
  context,
  senderId,
  senderRole,
  receiverId,
  receiverRole,
}: DualNotifyOptions) {
  const template = NotificationMessages[type];

  const [receiverMsg, senderMsg] = [
    template.receiver(context),
    template.sender(context),
  ];

  await Promise.all([
    NotificationService.send({
      type,
      toUserId: receiverId,
      toRole: receiverRole,
      title: receiverMsg.title.toString(),
      message: receiverMsg.message.toString(),
      fromUser: { id: senderId, role: senderRole },
    }),
    NotificationService.send({
      type,
      toUserId: senderId,
      toRole: senderRole,
      title: senderMsg.title.toString(),
      message: senderMsg.message.toString(),
      fromUser: { id: receiverId, role: receiverRole },
    }),
  ]);
}

export async function sendSingleNotification({
  type,
  context,
  toUserId,
  toRole,
  fromUser,
  direction = "receiver",
}: SingleNotifyOptions) {
  const template = NotificationMessages[type]?.[direction];
  if (!template) throw new Error(`Missing notification template for ${type}`);

  const { title, message } = template(context);

  await NotificationService.send({
    type,
    toRole,
    toUserId,
    fromUser,
    title: title.toString(),
    message: message.toString(),
  });
}

export const getAllNotifications = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { user } = req;
    const { page = 1, limit = 10, user: queryUser, queryRole } = req.query;

    const pageNumber = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit as string, 10) || 10, 10);

    const targetUserId = queryUser || user?.id;
    const targetRole = queryUser ? queryRole : user?.role;

    if (!targetUserId || !targetRole)
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Missing user identification."));

    const matchStage =
      user?.role === "admin" && !queryUser
        ? {}
        : { "to.user": new mongoose.Types.ObjectId(targetUserId) };

    const notifications = await Notification.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: (pageNumber - 1) * limitNumber },
      { $limit: limitNumber },
      // Lookup to user details
      {
        $lookup: {
          from: "users",
          localField: "to.user",
          foreignField: "_id",
          as: "toUser",
        },
      },
      // Lookup from user details
      {
        $lookup: {
          from: "users",
          localField: "from.user",
          foreignField: "_id",
          as: "fromUser",
        },
      },

      // Lookup profile image for "to.user"
      {
        $lookup: {
          from: "fileuploads",
          let: { userId: "$to.user" },
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
            { $project: { url: 1, _id: 0 } },
            { $limit: 1 },
          ],
          as: "toProfilePic",
        },
      },

      // Lookup profile image for "from.user"
      {
        $lookup: {
          from: "fileuploads",
          let: { userId: "$from.user" },
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
            { $project: { url: 1, _id: 0 } },
            { $limit: 1 },
          ],
          as: "fromProfilePic",
        },
      },

      // Merge user & profile into final shape
      {
        $addFields: {
          to: {
            $mergeObjects: [
              { role: "$to.role" },
              { $arrayElemAt: ["$toUser", 0] },
              { profilePic: { $arrayElemAt: ["$toProfilePic.url", 0] } },
            ],
          },
          from: {
            $mergeObjects: [
              { role: "$from.role" },
              { $arrayElemAt: ["$fromUser", 0] },
              { profilePic: { $arrayElemAt: ["$fromProfilePic.url", 0] } },
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          type: 1,
          title: 1,
          readAt: 1,
          status: 1,
          message: 1,
          createdAt: 1,
          to: {
            _id: 1,
            name: 1,
            email: 1,
            status: 1,
            mobile: 1,
            userType: 1,
            fullName: 1,
            profilePic: 1,
          },
          from: {
            _id: 1,
            name: 1,
            email: 1,
            status: 1,
            mobile: 1,
            userType: 1,
            fullName: 1,
            profilePic: 1,
          },
        },
      },
    ]);

    const total = await Notification.countDocuments(matchStage);

    const data = paginationResult(
      pageNumber,
      limitNumber,
      total,
      notifications
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          data,
          notifications.length
            ? "Notifications fetched successfully."
            : "No notifications found."
        )
      );
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: userId } = req.user || {};
    const { notificationId, markAll } = req.query;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // =====================
    // 🔹 Mark ALL as Read
    // =====================
    if (markAll === "true") {
      const result = await Notification.updateMany(
        { "to.user": userObjectId, status: "unread" },
        { $set: { status: "read", readAt: new Date() } }
      );
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { modifiedCount: result.modifiedCount },
            `${result.modifiedCount} notifications marked as read.`
          )
        );
    }

    // =====================
    // 🔹 Mark ONE as Read
    // =====================
    if (!notificationId) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Notification ID is required."));
    }

    const updated = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId as string),
        "to.user": userObjectId,
        status: { $ne: "read" },
      },
      { $set: { status: "read", readAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            null,
            "Notification not found or already marked as read."
          )
        );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updated,
          "Notification marked as read successfully."
        )
      );
  } catch (error) {
    next(error);
  }
};

export const getNotificationStats = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { user } = req;
    const { user: queryUser } = req.query;

    const targetUserId = queryUser || user?.id;

    if (!targetUserId) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "User ID is required."));
    }

    const userObjectId = new mongoose.Types.ObjectId(targetUserId as string);

    const stats = await Notification.aggregate([
      { $match: { "to.user": userObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const mapped = stats.reduce(
      (acc, curr) => {
        acc[curr._id] = curr.count;
        acc.total += curr.count;
        return acc;
      },
      {
        read: 0,
        unread: 0,
        deleted: 0,
        total: 0,
      }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, mapped, "Notification stats fetched successfully.")
      );
  } catch (error) {
    next(error);
  }
};