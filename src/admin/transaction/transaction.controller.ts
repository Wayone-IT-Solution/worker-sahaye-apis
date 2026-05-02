import { Request, Response } from "express";
import mongoose from "mongoose";
import { Transaction, TransactionType, TransactionStatus, PaymentGateway } from "../../modals/transaction.model";
import { User } from "../../modals/user.model";
import { SubscriptionPlan } from "../../modals/subscriptionplan.model";
import { BadgeBundle } from "../../modals/badgeBundle.model";
import { Badge } from "../../modals/badge.model";

interface AuthRequest extends Request {
  user?: { id: string; role?: string };
}

export class TransactionController {
  // Get all transactions with filtering and pagination
  static async getAllTransactions(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        userId,
        transactionType,
        status,
        paymentGateway,
        startDate,
        endDate,
        sortBy = "transactionDate",
        sortOrder = "desc",
      } = req.query;

      const query: any = {};

      // Add filters
      if (userId && mongoose.Types.ObjectId.isValid(userId as string)) {
        query.user = new mongoose.Types.ObjectId(userId as string);
      }

      if (transactionType && Object.values(TransactionType).includes(transactionType as TransactionType)) {
        query.transactionType = transactionType;
      }

      if (status && Object.values(TransactionStatus).includes(status as TransactionStatus)) {
        query.status = status;
      }

      if (paymentGateway && Object.values(PaymentGateway).includes(paymentGateway as PaymentGateway)) {
        query.paymentGateway = paymentGateway;
      }

      // Date range filter
      if (startDate || endDate) {
        query.transactionDate = {};
        if (startDate) {
          query.transactionDate.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.transactionDate.$lte = new Date(endDate as string);
        }
      }

      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortOrder === "desc" ? -1 : 1;

      const skip = (Number(page) - 1) * Number(limit);

      const transactions = await Transaction.find(query)
        .populate("user", "fullName email mobile userType")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean();

      const total = await Transaction.countDocuments(query);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
      });
    } catch (error: any) {
      console.error("getAllTransactions error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch transactions",
        error: error.message,
      });
    }
  }

  // Get transaction by ID
  static async getTransactionById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID",
        });
      }

      const transaction = await Transaction.findById(id)
        .populate("user", "fullName email mobile userType")
        .lean();

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error: any) {
      console.error("getTransactionById error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch transaction",
        error: error.message,
      });
    }
  }

  // Get user's transaction history
  static async getUserTransactions(req: AuthRequest, res: Response) {
    console.log("🔍 getUserTransactions called for URL:", req.originalUrl);
    try {
      console.log("getUserTransactions - req.user:", req.user);
      console.log("getUserTransactions - headers:", req.headers.authorization ? "Token present" : "No token");

      const userId = req.user?.id;
      const {
        page = 1,
        limit = 10,
        transactionType,
        status,
        startDate,
        endDate,
      } = req.query;

      console.log("getUserTransactions - userId:", userId);

      if (!userId) {
        console.log("getUserTransactions - No userId, returning 401");
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const query: any = { user: new mongoose.Types.ObjectId(userId) };

      // Add filters
      if (transactionType && Object.values(TransactionType).includes(transactionType as TransactionType)) {
        query.transactionType = transactionType;
      }

      if (status && Object.values(TransactionStatus).includes(status as TransactionStatus)) {
        query.status = status;
      }

      // Date range filter
      if (startDate || endDate) {
        query.transactionDate = {};
        if (startDate) {
          query.transactionDate.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.transactionDate.$lte = new Date(endDate as string);
        }
      }

      const skip = (Number(page) - 1) * Number(limit);

      const transactions = await Transaction.find(query)
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      const total = await Transaction.countDocuments(query);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
      });
    } catch (error: any) {
      console.error("getUserTransactions error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user transactions",
        error: error.message,
      });
    }
  }

  // Create a transaction record (internal use)
  static async createTransaction(req: AuthRequest, res: Response) {
    try {
      const {
        userId,
        transactionType,
        itemId,
        itemName,
        amount,
        currency = "INR",
        paymentGateway,
        paymentId,
        orderId,
        status = TransactionStatus.PENDING,
        notes,
      } = req.body;

      // Validate required fields
      if (!userId || !transactionType || !itemId || !itemName || !paymentGateway) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // Validate transaction type
      if (!Object.values(TransactionType).includes(transactionType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction type",
        });
      }

      // Validate payment gateway
      if (!Object.values(PaymentGateway).includes(paymentGateway)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment gateway",
        });
      }

      // Validate status
      if (!Object.values(TransactionStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction status",
        });
      }

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify item exists based on transaction type
      let itemExists = false;
      switch (transactionType) {
        case TransactionType.SUBSCRIPTION_PLAN:
          itemExists = !!(await SubscriptionPlan.findById(itemId));
          break;
        case TransactionType.BADGE_BUNDLE:
          itemExists = !!(await BadgeBundle.findById(itemId));
          break;
        case TransactionType.INDIVIDUAL_BADGE:
          itemExists = !!(await Badge.findById(itemId));
          break;
      }

      if (!itemExists) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      const transaction = new Transaction({
        user: userId,
        transactionType,
        itemId,
        itemName,
        amount: Number(amount),
        currency,
        status,
        paymentGateway,
        paymentId,
        orderId,
        notes,
        transactionDate: new Date(),
      });

      await transaction.save();

      const populatedTransaction = await Transaction.findById(transaction._id)
        .populate("user", "fullName email mobile userType")
        .lean();

      res.status(201).json({
        success: true,
        message: "Transaction created successfully",
        data: populatedTransaction,
      });
    } catch (error: any) {
      console.error("createTransaction error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create transaction",
        error: error.message,
      });
    }
  }

  // Update transaction status
  static async updateTransactionStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, paymentId, orderId, refundId, refundAmount, refundReason, notes } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID",
        });
      }

      if (!status || !Object.values(TransactionStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid or missing status",
        });
      }

      const updateData: any = { status };

      if (paymentId) updateData.paymentId = paymentId;
      if (orderId) updateData.orderId = orderId;
      if (refundId) updateData.refundId = refundId;
      if (refundAmount) updateData.refundAmount = refundAmount;
      if (refundReason) updateData.refundReason = refundReason;
      if (notes) updateData.notes = notes;

      if (status === TransactionStatus.REFUNDED) {
        updateData.refundedAt = new Date();
      }

      const transaction = await Transaction.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).populate("user", "fullName email mobile userType");

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      res.json({
        success: true,
        message: "Transaction updated successfully",
        data: transaction,
      });
    } catch (error: any) {
      console.error("updateTransactionStatus error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update transaction",
        error: error.message,
      });
    }
  }

  // Delete transaction (admin only)
  static async deleteTransaction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID",
        });
      }

      const transaction = await Transaction.findByIdAndDelete(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      res.json({
        success: true,
        message: "Transaction deleted successfully",
      });
    } catch (error: any) {
      console.error("deleteTransaction error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete transaction",
        error: error.message,
      });
    }
  }

  // Get transaction statistics
  static async getTransactionStats(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const matchQuery: any = {};

      if (startDate || endDate) {
        matchQuery.transactionDate = {};
        if (startDate) {
          matchQuery.transactionDate.$gte = new Date(startDate as string);
        }
        if (endDate) {
          matchQuery.transactionDate.$lte = new Date(endDate as string);
        }
      }

      const stats = await Transaction.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            successfulTransactions: {
              $sum: { $cond: [{ $eq: ["$status", TransactionStatus.SUCCESS] }, 1, 0] }
            },
            successfulAmount: {
              $sum: { $cond: [{ $eq: ["$status", TransactionStatus.SUCCESS] }, "$amount", 0] }
            },
            pendingTransactions: {
              $sum: { $cond: [{ $eq: ["$status", TransactionStatus.PENDING] }, 1, 0] }
            },
            failedTransactions: {
              $sum: { $cond: [{ $eq: ["$status", TransactionStatus.FAILED] }, 1, 0] }
            },
            refundedTransactions: {
              $sum: { $cond: [{ $eq: ["$status", TransactionStatus.REFUNDED] }, 1, 0] }
            },
            refundedAmount: {
              $sum: { $cond: [{ $eq: ["$status", TransactionStatus.REFUNDED] }, "$refundAmount", 0] }
            },
          }
        }
      ]);

      const transactionTypeStats = await Transaction.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$transactionType",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          }
        }
      ]);

      const paymentGatewayStats = await Transaction.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$paymentGateway",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          overview: stats[0] || {
            totalTransactions: 0,
            totalAmount: 0,
            successfulTransactions: 0,
            successfulAmount: 0,
            pendingTransactions: 0,
            failedTransactions: 0,
            refundedTransactions: 0,
            refundedAmount: 0,
          },
          byTransactionType: transactionTypeStats,
          byPaymentGateway: paymentGatewayStats,
        },
      });
    } catch (error: any) {
      console.error("getTransactionStats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch transaction statistics",
        error: error.message,
      });
    }
  }
}