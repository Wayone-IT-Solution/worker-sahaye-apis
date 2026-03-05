import express from "express";
import multer from "multer";
import { asyncHandler } from "../../utils/asyncHandler";
import { QuotationController } from "./quotation.controller";
import {
  allowOnly,
  authenticateToken,
  isAdmin,
} from "../../middlewares/authMiddleware";

const {
  createQuotation,
  getQuotationRequestOptions,
  getAllQuotations,
  getQuotationById,
  respondToQuotation,
  updateQuotationById,
  deleteQuotationById,
} = QuotationController;

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Only PDF/DOC/DOCX files are allowed"));
  },
});

router
  .get(
    "/request-options",
    authenticateToken,
    isAdmin,
    asyncHandler(getQuotationRequestOptions),
  )
  .post(
    "/:requestModel",
    authenticateToken,
    isAdmin,
    upload.single("quotationDocument"),
    asyncHandler(createQuotation),
  )
  .get("/detail/:id", authenticateToken, asyncHandler(getQuotationById))
  .get("/:requestModel/:id", authenticateToken, asyncHandler(getQuotationById))
  .get("/:requestModel?", authenticateToken, asyncHandler(getAllQuotations))
  .put(
    "/:id",
    authenticateToken,
    isAdmin,
    upload.single("quotationDocument"),
    asyncHandler(updateQuotationById),
  )
  .patch(
    "/:id/respond",
    authenticateToken,
    allowOnly("employer", "contractor"),
    asyncHandler(respondToQuotation),
  )
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteQuotationById));

export default router;
