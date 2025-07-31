import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { QuotationController } from "./quotation.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createQuotation,
  getAllQuotations,
  getQuotationById,
  updateQuotationById,
  deleteQuotationById,
} = QuotationController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllQuotations))
  .post("/", authenticateToken, asyncHandler(createQuotation))
  .get("/:id", authenticateToken, asyncHandler(getQuotationById))
  .put("/:id", authenticateToken, asyncHandler(updateQuotationById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteQuotationById));

export default router;
