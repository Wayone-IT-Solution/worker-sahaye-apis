import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Pdf, IPdf } from "../../modals/pdffile.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import mongoose from "mongoose";
import {
  buildMatchStage,
  buildSortObject,
  buildPaginationResponse,
  SEARCH_FIELD_MAP,
} from "../../utils/queryBuilder";

const PdfService = new CommonService<IPdf>(Pdf);

export class PdfController {
  // Create PDF
  static async createPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const url = req?.body?.file?.[0]?.url;
      if (!url)
        return res.status(403).json(new ApiError(403, "PDF file is required."));

      const { header, order } = req.body;
      if (!header) return res.status(400).json(new ApiError(400, "Header ID is required."));

      const result = await PdfService.create({ url, header, order });
      return res.status(201).json(new ApiResponse(201, result, "PDF created successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Get all PDFs
  static async getAllPdfs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const matchStage = buildMatchStage(
        {
          status: req.query.status as string,
          search: req.query.search as string,
          searchKey: req.query.searchKey as string,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          headerId: req.query.headerId as string,
        },
        SEARCH_FIELD_MAP.pdffile
      );

      const sortObj = buildSortObject(
        req.query.sortKey as string,
        req.query.sortDir as string,
        { order: 1 }
      );

      const total = await Pdf.countDocuments(matchStage);
      const pdfs = await Pdf.find(matchStage)
        .populate("header", "title icon description")
        .sort(sortObj)
        .skip(skip)
        .limit(limit);

      return res.status(200).json(
        new ApiResponse(
          200,
          buildPaginationResponse(pdfs, total, page, limit),
          "PDFs fetched successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  // Get PDF by ID
  static async getPdfById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PdfService.getById(req.params.id);
      if (!result) return res.status(404).json(new ApiError(404, "PDF not found"));

      return res.status(200).json(new ApiResponse(200, result, "PDF fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Update PDF
  static async updatePdfById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json(new ApiError(400, "Invalid PDF ID"));

      const record = await PdfService.getById(id);
      if (!record) return res.status(404).json(new ApiError(404, "PDF not found"));

      const url = req?.body?.file?.[0]?.url || record.url;

      const result = await PdfService.updateById(id, {
        ...req.body,
        url,
      });

      return res.status(200).json(new ApiResponse(200, result, "PDF updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Delete PDF
  static async deletePdfById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PdfService.deleteById(req.params.id);
      if (!result) return res.status(404).json(new ApiError(404, "Failed to delete PDF"));

      return res.status(200).json(new ApiResponse(200, result, "PDF deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
