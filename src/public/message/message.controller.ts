import mongoose from "mongoose";
import { Request, Response } from "express";
import Message from "../../modals/message.model";

export class MessageController {
  /**
   * Create and save a new message
   * @param req
   * @param res
   * @returns Promise<any>
   */
  static async createMessage(req: Request | any, res: Response): Promise<any> {
    try {
      const { role, _id: senderId } = req.user;
      const { receiverId, text, chatFileUrl } = req.body;
      const sender = role === "passenger" ? "passenger" : "driver";

      if (!sender || !senderId || !receiverId) {
        return res
          .status(400)
          .json({ message: "sender, senderId, and receiverId are required" });
      }
      if (sender !== "passenger" && sender !== "driver") {
        return res
          .status(400)
          .json({ message: "sender must be 'passenger' or 'driver'" });
      }
      if (
        !mongoose.Types.ObjectId.isValid(senderId) ||
        !mongoose.Types.ObjectId.isValid(receiverId)
      ) {
        return res
          .status(400)
          .json({ message: "Invalid senderId or receiverId" });
      }

      const newMessage = new Message({
        text,
        sender,
        senderId,
        receiverId,
        chatFileUrl,
        isRead: false,
      });

      const savedMessage = await newMessage.save();
      return res.status(201).json({
        success: true,
        data: savedMessage,
        message: "Message sent successfully!",
      });
    } catch (error) {
      console.log("Error creating message:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get a single message by ID
   * @param req
   * @param res
   * @returns Promise<any>
   */
  static async getMessageById(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      const message = await Message.findById(id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      return res.status(200).json({ success: true, message });
    } catch (error) {
      console.log("Error fetching message:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get all messages exchanged between a passenger and driver, sorted by createdAt ascending
   * @param req
   * @param res
   * @returns Promise<any>
   */
  static async getChatBetweenUsers(req: Request, res: Response): Promise<any> {
    try {
      const { passengerId, driverId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(passengerId) ||
        !mongoose.Types.ObjectId.isValid(driverId)
      ) {
        return res
          .status(400)
          .json({ message: "Invalid passengerId or driverId" });
      }

      // Find messages where:
      // (senderId == passengerId AND receiverId == driverId) OR (senderId == driverId AND receiverId == passengerId)
      const messages = await Message.aggregate([
        {
          $match: {
            $or: [
              {
                senderId: new mongoose.Types.ObjectId(passengerId),
                receiverId: new mongoose.Types.ObjectId(driverId),
              },
              {
                senderId: new mongoose.Types.ObjectId(driverId),
                receiverId: new mongoose.Types.ObjectId(passengerId),
              },
            ],
          },
        },
        {
          $sort: { createdAt: 1 },
        },
        {
          $lookup: {
            from: "passengers",
            localField: "senderId",
            foreignField: "_id",
            as: "senderPassenger",
          },
        },
        {
          $lookup: {
            from: "drivers",
            localField: "senderId",
            foreignField: "_id",
            as: "senderDriver",
          },
        },
        {
          $lookup: {
            from: "passengers",
            localField: "receiverId",
            foreignField: "_id",
            as: "receiverPassenger",
          },
        },
        {
          $lookup: {
            from: "drivers",
            localField: "receiverId",
            foreignField: "_id",
            as: "receiverDriver",
          },
        },
        {
          $addFields: {
            senderInfo: {
              $cond: {
                if: { $gt: [{ $size: "$senderPassenger" }, 0] },
                then: { $arrayElemAt: ["$senderPassenger", 0] },
                else: { $arrayElemAt: ["$senderDriver", 0] },
              },
            },
            receiverInfo: {
              $cond: {
                if: { $gt: [{ $size: "$receiverPassenger" }, 0] },
                then: { $arrayElemAt: ["$receiverPassenger", 0] },
                else: { $arrayElemAt: ["$receiverDriver", 0] },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            text: 1,
            isRead: 1,
            createdAt: 1,
            chatFileUrl: 1,
            senderRole: "$senderInfo.role",
            senderName: "$senderInfo.name",
            receiverName: "$receiverInfo.name",
            receiverRole: "$receiverInfo.role",
          },
        },
      ]);

      return res.status(200).json({ success: true, data: messages });
    } catch (error) {
      console.log("Error fetching chat messages:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Mark messages as read from sender to receiver
   * @param req
   * @param res
   * @returns Promise<any>
   */
  static async markMessagesAsRead(req: Request, res: Response): Promise<any> {
    try {
      const { senderId, receiverId } = req.body;

      if (!senderId || !receiverId) {
        return res
          .status(400)
          .json({ message: "senderId and receiverId are required" });
      }
      if (
        !mongoose.Types.ObjectId.isValid(senderId) ||
        !mongoose.Types.ObjectId.isValid(receiverId)
      ) {
        return res
          .status(400)
          .json({ message: "Invalid senderId or receiverId" });
      }

      // Update all unread messages where senderId = senderId and receiverId = receiverId
      const updateResult = await Message.updateMany(
        { senderId, receiverId, isRead: false },
        { $set: { isRead: true } }
      );

      return res.status(200).json({
        success: true,
        message: `${updateResult.modifiedCount} messages marked as read.`,
      });
    } catch (error) {
      console.log("Error marking messages as read:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

// GET /api/conversations
export const getUniqueConversations = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const conversations = await Message.aggregate([
      {
        $addFields: {
          pairKey: {
            $cond: [
              { $lt: ["$senderId", "$receiverId"] },
              {
                $concat: [
                  { $toString: "$senderId" },
                  "_",
                  { $toString: "$receiverId" },
                ],
              },
              {
                $concat: [
                  { $toString: "$receiverId" },
                  "_",
                  { $toString: "$senderId" },
                ],
              },
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$pairKey",
          messageId: { $first: "$_id" },
          text: { $first: "$text" },
          isRead: { $first: "$isRead" },
          createdAt: { $first: "$createdAt" },
          sender: { $first: "$sender" },
          senderId: { $first: "$senderId" },
          receiverId: { $first: "$receiverId" },
        },
      },

      // Lookup sender details (from passengers or drivers)
      {
        $lookup: {
          from: "passengers",
          localField: "senderId",
          foreignField: "_id",
          as: "senderPassenger",
        },
      },
      {
        $lookup: {
          from: "drivers",
          localField: "senderId",
          foreignField: "_id",
          as: "senderDriver",
        },
      },
      {
        $lookup: {
          from: "passengers",
          localField: "receiverId",
          foreignField: "_id",
          as: "receiverPassenger",
        },
      },
      {
        $lookup: {
          from: "drivers",
          localField: "receiverId",
          foreignField: "_id",
          as: "receiverDriver",
        },
      },

      // Compose final sender and receiver
      {
        $addFields: {
          senderInfo: {
            $cond: [
              { $eq: ["$sender", "passenger"] },
              { $arrayElemAt: ["$senderPassenger", 0] },
              { $arrayElemAt: ["$senderDriver", 0] },
            ],
          },
          receiverInfo: {
            $cond: [
              { $eq: ["$sender", "passenger"] },
              { $arrayElemAt: ["$receiverDriver", 0] },
              { $arrayElemAt: ["$receiverPassenger", 0] },
            ],
          },
        },
      },

      // Final shape
      {
        $project: {
          _id: 0,
          text: 1,
          messageId: 1,
          createdAt: 1,
          sender: {
            _id: "$senderId",
            role: "$sender",
            name: "$senderInfo.name",
            email: "$senderInfo.email",
            phone: "$senderInfo.phoneNumber",
          },
          receiver: {
            _id: "$receiverId",
            role: {
              $cond: [{ $eq: ["$sender", "passenger"] }, "driver", "passenger"],
            },
            name: "$receiverInfo.name",
            email: "$receiverInfo.email",
            phone: "$receiverInfo.phoneNumber",
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.log("Error fetching unique conversations", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      error,
    });
  }
};
