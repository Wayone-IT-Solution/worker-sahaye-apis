import {
  UserRole,
  Notification,
  NotificationType,
} from "../modals/notificationModel";
import admin from "../utils/firebase";
import mongoose, { Types } from "mongoose";
import Driver from "../modals/driverModal";
import ApiResponse from "../utils/ApiResponse";
import Passenger from "../modals/passengerModal";
import { paginationResult } from "../utils/helper";
import { Request, Response, NextFunction } from "express";

// Assuming req.user is set by auth middleware
interface SendNotificationOptions {
  title: string;
  message: string;
  toRole: UserRole;
  toUserId: string;
  type: NotificationType;
  fromUser?: { id: string; role: UserRole };
}

export const NotificationService = {
  async send(
    options: SendNotificationOptions,
    authUser?: { id: string; role: UserRole }
  ) {
    const { toUserId, toRole, type, title, message, fromUser } = options;
    const sender = fromUser || authUser;
    if (!sender) throw new Error("Sender info (from token) is missing.");

    const notification: any = await Notification.create({
      type,
      title,
      message,
      to: { user: new Types.ObjectId(toUserId), role: toRole },
      from: { user: new Types.ObjectId(sender.id), role: sender.role },
    });

    let fcmToken: string | null = null;

    try {
      if (toRole === "passenger") {
        const passenger = await Passenger.findById(toUserId);
        if (!passenger)
          throw new Error(`Passenger not found with ID: ${toUserId}`);

        fcmToken = passenger.fcmToken || null;
      } else if (toRole === "driver") {
        const driver = await Driver.findById(toUserId);
        if (!driver) throw new Error(`Driver not found with ID: ${toUserId}`);

        fcmToken = driver.fcmToken || null;
      } else throw new Error(`Invalid role: ${toRole}`);
    } catch (error) {
      console.log(
        `Failed to get FCM token for role "${toRole}" and user ID "${toUserId}":`
      );
      fcmToken = null;
    }

    // 3. Send FCM push if token exists
    if (fcmToken && admin) {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body: message },
        data: { type, notificationId: notification._id.toString() },
      });
    }
    return notification;
  },
};

export const getAllNotifications = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    let { _id, role } = req.user;
    const { page = 1, limit = 10, user } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (user) {
      _id = user;
      role = "passenger";
    }

    const matchStage: any =
      role === "admin" && !user
        ? {}
        : {
            $or: [
              { "to.user": new mongoose.Types.ObjectId(_id) },
              { "from.user": new mongoose.Types.ObjectId(_id) },
            ],
          };

    const pipeline: any[] = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: (pageNumber - 1) * limitNumber },
      { $limit: limitNumber },
      // Lookup 'to' user
      {
        $lookup: {
          from: "passengers",
          localField: "to.user",
          foreignField: "_id",
          as: "toPassenger",
          pipeline: [{ $project: { name: 1, phone: 1 } }],
        },
      },
      {
        $lookup: {
          from: "drivers",
          localField: "to.user",
          foreignField: "_id",
          as: "toDriver",
          pipeline: [{ $project: { name: 1, phone: 1 } }],
        },
      },

      // Merge 'to' user based on role
      {
        $addFields: {
          to: {
            $mergeObjects: [
              { role: "$to.role" },
              {
                $cond: [
                  { $eq: ["$to.role", "passenger"] },
                  { $arrayElemAt: ["$toPassenger", 0] },
                  { $arrayElemAt: ["$toDriver", 0] },
                ],
              },
            ],
          },
        },
      },

      // Lookup 'from' user
      {
        $lookup: {
          from: "passengers",
          localField: "from.user",
          foreignField: "_id",
          as: "fromPassenger",
          pipeline: [{ $project: { name: 1, phone: 1 } }],
        },
      },
      {
        $lookup: {
          from: "drivers",
          localField: "from.user",
          foreignField: "_id",
          as: "fromDriver",
          pipeline: [{ $project: { name: 1, phone: 1 } }],
        },
      },

      // Merge 'from' user based on role
      {
        $addFields: {
          from: {
            $cond: [
              {
                $and: [
                  { $ne: ["$from", null] },
                  { $eq: ["$from.role", "passenger"] },
                ],
              },
              {
                $mergeObjects: [
                  { role: "$from.role" },
                  { $arrayElemAt: ["$fromPassenger", 0] },
                ],
              },
              {
                $mergeObjects: [
                  { role: "$from.role" },
                  { $arrayElemAt: ["$fromDriver", 0] },
                ],
              },
            ],
          },
        },
      },

      // Remove temp fields
      {
        $project: {
          __v: 0,
          toDriver: 0,
          updatedAt: 0,
          fromDriver: 0,
          toPassenger: 0,
          fromPassenger: 0,
        },
      },
    ];

    const notifications = await Notification.aggregate(pipeline);
    const totalCount = await Notification.countDocuments(matchStage);
    const data = paginationResult(
      pageNumber,
      limitNumber,
      totalCount,
      notifications
    );

    if (notifications.length === 0)
      return res
        .status(200)
        .json(new ApiResponse(200, data, "No Notifications found"));

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Notifications fetched successfully"));
  } catch (error) {
    next(error);
  }
};
