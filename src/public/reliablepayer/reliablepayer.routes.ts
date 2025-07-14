import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ReliablePayerController } from "./reliablepayer.controller";
import { allowAllExcept, authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createReliablePayer,
  getAllReliablePayers,
  getReliablePayerById,
  updateReliablePayerById,
  deleteReliablePayerById,
  getReliablePayerDetails
} = ReliablePayerController;

const router = express.Router();

router
  .get("/",
    authenticateToken,
    isAdmin,
    asyncHandler(getAllReliablePayers))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getReliablePayerById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateReliablePayerById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteReliablePayerById))
  .post("/",
    authenticateToken,
    allowAllExcept(["admin", "agent", "worker"] as any),
    asyncHandler(createReliablePayer))
  .patch("/",
    authenticateToken,
    allowAllExcept(["admin", "agent", "worker"] as any),
    asyncHandler(getReliablePayerDetails));

export default router;
