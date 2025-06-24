import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import {
  IConnection,
  ConnectionModel,
  ConnectionStatus,
} from "../../modals/connection.model";
import User from "../../modals/user.model";
import FileUpload from "../../modals/fileupload.model";

// Create a new connection
export const createConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: requester } = (req as any).user;
    const { recipient } = req.body;
    if (!requester || !recipient) {
      return res
        .status(400)
        .json(new ApiError(400, "Both requester and recipient are required."));
    }

    if (requester.toString() === recipient.toString()) {
      return res
        .status(400)
        .json(
          new ApiError(400, "Requester and recipient cannot be the same user.")
        );
    }

    if (
      !mongoose.isValidObjectId(requester) ||
      !mongoose.isValidObjectId(recipient)
    ) {
      return res.status(400).json(new ApiError(400, "Invalid user ID format."));
    }

    // Check for existing accepted connection
    const existing = await ConnectionModel.findOne({
      $or: [
        { requester, recipient, status: ConnectionStatus.ACCEPTED },
        {
          requester: recipient,
          recipient: requester,
          status: ConnectionStatus.ACCEPTED,
        },
      ],
    });
    if (existing) {
      return res
        .status(200)
        .json(new ApiResponse(200, existing, "Connection already established"));
    }

    const pending = await ConnectionModel.findOne({
      requester,
      recipient,
      status: ConnectionStatus.PENDING,
    });
    if (pending) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, pending, "Connection request is already pending")
        );
    }

    const removed = await ConnectionModel.findOne({
      status: ConnectionStatus.REMOVED,
      $or: [
        { requester, recipient },
        { requester: recipient, recipient: requester },
      ],
    });
    if (removed) {
      removed.status = ConnectionStatus.PENDING;
      removed.requester = requester;
      removed.recipient = recipient;

      await removed.save();
      return res
        .status(200)
        .json(new ApiResponse(200, removed, "Connection request re-initiated"));
    }

    const newConn = await ConnectionModel.create({ requester, recipient });
    return res
      .status(201)
      .json(
        new ApiResponse<IConnection>(
          201,
          newConn,
          "Connection created successfully"
        )
      );
  } catch (err: any) {
    console.log("Connection error: ", err);
    return res.status(400).json(new ApiError(400, "Something went wrong."));
  }
};

// Retrieve all connections (with optional filters)
export const getAllConnections = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: userId } = (req as any).user;
    const { type, page = 1, limit = 10, offlimit = false } = req.query;

    const validTypes = ["pending", "accepted", "removed", "send-request"];
    if (!type || !validTypes.includes(type as string)) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or missing 'type' query parameter."));
    }

    const numericPage = parseInt(page as string, 10) || 1;
    const numericLimit = parseInt(limit as string, 10) || 10;
    const skip = (numericPage - 1) * numericLimit;

    let query = {};
    let populateFields: any[] = [];
    const keys = { _id: 1, requester: 1, recipient: 1, updatedAt: 1 };

    switch (type) {
      case "send-request":
        query = { requester: userId, status: ConnectionStatus.PENDING };
        populateFields.push({ path: "recipient", select: "fullName email" });
        break;
      case "pending":
        query = { recipient: userId, status: ConnectionStatus.PENDING };
        populateFields.push({ path: "requester", select: "fullName email" });
        break;
      case "accepted":
        query = {
          $or: [{ requester: userId }, { recipient: userId }],
          status: ConnectionStatus.ACCEPTED,
        };
        populateFields.push(
          { path: "requester", select: "fullName email" },
          { path: "recipient", select: "fullName email" }
        );
        break;
      case "removed":
        query = {
          $or: [{ requester: userId }, { recipient: userId }],
          status: ConnectionStatus.REMOVED,
        };
        populateFields.push(
          { path: "requester", select: "fullName email" },
          { path: "recipient", select: "fullName email" }
        );
        break;
    }

    const total = await ConnectionModel.countDocuments(query);

    const connectionQuery = ConnectionModel.find(query, keys)
      .sort({ updatedAt: -1 })
      .populate(populateFields)
      .skip(skip)
      .limit(numericLimit);
    const connections = await connectionQuery;

    // Step 1: Extract all user IDs (either requester or recipient)
    const users = connections.map((conn) => {
      const isRecipientPopulated =
        conn.recipient &&
        typeof conn.recipient === "object" &&
        "fullName" in conn.recipient;
      const user = isRecipientPopulated ? conn.recipient : conn.requester;
      return {
        user,
        isRecipientPopulated,
        connectionId: conn._id,
        updatedAt: conn.updatedAt,
      };
    });

    const userIdSet = new Set(users.map((u) => u.user._id.toString()));
    const profileFiles = await FileUpload.find({
      userId: { $in: Array.from(userIdSet) },
      tag: "profilePic",
    }).select("userId url");
    const profilePicMap = new Map(
      profileFiles.map((f) => [f.userId.toString(), f.url])
    );

    // Step 3: Final flattened result
    const resultsWithProfilePics = users.map(
      ({ user, connectionId, updatedAt }: any) => ({
        updatedAt,
        userId: user._id,
        email: user.email,
        _id: connectionId,
        fullName: user.fullName,
        profilePic: profilePicMap.get(user._id.toString()) || null,
      })
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          results: resultsWithProfilePics,
          pagination: {
            totalItems: total,
            currentPage: numericPage,
            itemsPerPage: numericLimit,
            totalPages: Math.ceil(total / numericLimit),
          },
        },
        "Connections fetched successfully"
      )
    );
  } catch (err) {
    next(err);
  }
};

export const getSuggestedUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: userId } = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Step 1: Find connected user IDs
    const connected = await ConnectionModel.find({
      $or: [{ requester: userId }, { recipient: userId }],
    }).select("requester recipient");

    const connectedIds = new Set<string>();
    connected.forEach((conn) => {
      connectedIds.add(conn.requester.toString());
      connectedIds.add(conn.recipient.toString());
    });
    connectedIds.add(userId); // exclude self

    const excludedIds = Array.from(connectedIds).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Step 2: Count total unconnected users (for pagination)
    const total = await User.countDocuments({ _id: { $nin: excludedIds } });

    // Step 3: Paginated user fetch + enrichment
    const suggestions = await User.aggregate([
      { $match: { _id: { $nin: excludedIds } } },
      { $sort: { createdAt: -1 } }, // optional, can change to popularity later
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "connections",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$requester", "$$userId"] },
                    { $eq: ["$recipient", "$$userId"] },
                  ],
                },
              },
            },
            { $count: "total" },
          ],
          as: "connectionStats",
        },
      },
      {
        $addFields: {
          totalConnections: {
            $ifNull: [{ $arrayElemAt: ["$connectionStats.total", 0] }, 0],
          },
        },
      },
      {
        $lookup: {
          from: "fileuploads",
          localField: "_id",
          foreignField: "userId",
          as: "profilePicData",
        },
      },
      {
        $addFields: {
          profilePic: { $arrayElemAt: ["$profilePicData.url", 0] },
        },
      },
      {
        $project: {
          userId: "$_id",
          fullName: 1,
          email: 1,
          totalConnections: 1,
          profilePic: 1,
        },
      },
      { $sort: { totalConnections: -1 } }, // final sort on enriched result
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          results: suggestions,
          pagination: {
            totalItems: total,
            currentPage: page,
            itemsPerPage: limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        "Suggested users fetched successfully"
      )
    );
  } catch (err) {
    next(err);
  }
};

// Retrieve a single connection by ID
export const getConnectionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json(new ApiError(400, "Invalid connection ID."));
    }
    const conn = await ConnectionModel.findById(id)
      .populate("requester", "fullName email")
      .populate("recipient", "fullName email")
      .exec();
    if (!conn) {
      return res.status(404).json(new ApiError(404, "Connection not found."));
    }
    return res
      .status(200)
      .json(
        new ApiResponse<IConnection>(
          200,
          conn,
          "Connection fetched successfully"
        )
      );
  } catch (err) {
    next(err);
  }
};

// Update connection by ID
export const updateConnectionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { id: user } = (req as any).user;

    if (!mongoose.isValidObjectId(id))
      return res.status(400).json(new ApiError(400, "Invalid connection ID."));

    const existingConnection = await ConnectionModel.findOne({
      _id: id,
      recipient: user,
    });

    if (!existingConnection) {
      return res
        .status(404)
        .json(new ApiError(404, "Connection not found or unauthorized."));
    }

    if (existingConnection.status !== ConnectionStatus.PENDING) {
      return res
        .status(400)
        .json(new ApiError(400, "Only pending connections can be accepted."));
    }

    // Update status to ACCEPTED
    existingConnection.status = ConnectionStatus.ACCEPTED;
    await existingConnection.save();

    const updated = await ConnectionModel.findById(id)
      .populate("requester", "fullName email")
      .populate("recipient", "fullName email")
      .exec();

    return res
      .status(200)
      .json(
        new ApiResponse<IConnection>(
          200,
          updated!,
          "Connection accepted successfully"
        )
      );
  } catch (err) {
    next(err);
  }
};

// remove user from connection
export const removeConnectionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { id: user } = (req as any).user;

    if (!mongoose.isValidObjectId(id))
      return res.status(400).json(new ApiError(400, "Invalid connection ID."));

    const connection = await ConnectionModel.findOne({
      _id: id,
      $or: [{ requester: user }, { recipient: user }],
    });

    if (!connection) {
      return res
        .status(404)
        .json(new ApiError(404, "Connection not found or unauthorized."));
    }

    if (connection.status === ConnectionStatus.PENDING)
      connection.status = ConnectionStatus.CANCELLED;
    else connection.status = ConnectionStatus.REMOVED;
    await connection.save();

    return res
      .status(200)
      .json(
        new ApiResponse<IConnection>(
          200,
          connection,
          "Connection marked as removed successfully"
        )
      );
  } catch (err) {
    next(err);
  }
};
