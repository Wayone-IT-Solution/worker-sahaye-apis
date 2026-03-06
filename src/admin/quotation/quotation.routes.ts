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
  respondToQuotationByRequestId,
  respondToQuotationByRequest,
  sendInstallmentNotification,
  updateInstallmentAdminApproval,
  updateInstallmentPayment,
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
const installmentProofUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (_, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Only PDF/JPEG/JPG/PNG/WEBP/HEIC files are allowed"));
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
  .patch(
    "/:id/installments/:installmentId/payment",
    authenticateToken,
    allowOnly("admin", "employer", "contractor"),
    installmentProofUpload.single("proofDocument"),
    asyncHandler(updateInstallmentPayment),
  )
  .patch(
    "/:id/installments/:installmentId/admin-approval",
    authenticateToken,
    isAdmin,
    asyncHandler(updateInstallmentAdminApproval),
  )
  .post(
    "/:id/send-installment-notification",
    authenticateToken,
    isAdmin,
    asyncHandler(sendInstallmentNotification),
  )
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
  .patch(
    "/request/:requestId/respond",
    authenticateToken,
    allowOnly("employer", "contractor"),
    asyncHandler(respondToQuotationByRequestId),
  )
  .patch(
    "/:requestModel/:requestId/respond",
    authenticateToken,
    allowOnly("employer", "contractor"),
    asyncHandler(respondToQuotationByRequest),
  )
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteQuotationById));

export default router;
