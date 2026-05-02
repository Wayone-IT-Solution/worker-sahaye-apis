import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { TransactionController } from "./transaction.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  getAllTransactions,
  getTransactionById,
  getUserTransactions,
  createTransaction,
  updateTransactionStatus,
  deleteTransaction,
  getTransactionStats,
} = TransactionController;

const router = express.Router();

// Admin routes
router.get("/stats", authenticateToken, isAdmin, asyncHandler(getTransactionStats));
router.get("/all", authenticateToken, isAdmin, asyncHandler(getAllTransactions));
router.post("/", authenticateToken, isAdmin, asyncHandler(createTransaction));
router.put("/:id/status", authenticateToken, isAdmin, asyncHandler(updateTransactionStatus));
router.delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteTransaction));

// User routes
console.log("🔧 Setting up transaction routes");
router.get("/user", authenticateToken, asyncHandler(getUserTransactions));

// Public routes (with authentication)
router.get("/:id", authenticateToken, asyncHandler(getTransactionById));

export default router;