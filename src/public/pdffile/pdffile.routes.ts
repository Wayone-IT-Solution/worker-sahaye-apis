import express from "express";
import { PdfController } from "./pdffile.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
    createPdf,
    getAllPdfs,
    getPdfById,
    updatePdfById,
    deletePdfById,
} = PdfController;

const router = express.Router();

router
    .get("/", asyncHandler(getAllPdfs))
    .post(
        "/",
        // authenticateToken,
        // isAdmin,
        dynamicUpload([{ name: "file", maxCount: 1 }]), // upload PDF file
        s3UploaderMiddleware("pdf"),
        asyncHandler(createPdf)
    )
    .get("/:id",
        // authenticateToken, isAdmin,
        asyncHandler(getPdfById))
    .put(
        "/:id",
        // authenticateToken,
        // isAdmin,
        dynamicUpload([{ name: "file", maxCount: 1 }]), // update PDF
        s3UploaderMiddleware("pdf"),
        asyncHandler(updatePdfById)
    )
    .delete("/:id",
        //  authenticateToken, isAdmin,
        asyncHandler(deletePdfById));

export default router;
