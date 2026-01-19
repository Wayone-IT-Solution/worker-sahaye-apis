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
  .post("/:requestModel", authenticateToken, asyncHandler(createQuotation))
  .get("/:requestModel/:id", authenticateToken, asyncHandler(getQuotationById))
  .get("/:requestModel?", authenticateToken, asyncHandler(getAllQuotations))
  .put("/:id", authenticateToken, asyncHandler(updateQuotationById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteQuotationById));

export default router;
