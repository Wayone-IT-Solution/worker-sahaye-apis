import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Pdf, IPdf } from "../../modals/pdffile.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import mongoose from "mongoose";

const PdfService = new CommonService<IPdf>(Pdf);

export class PdfController {
  // Create PDF
  static async createPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const url = req?.body?.file?.[0]?.url;
      if (!url)
        return res.status(403).json(new ApiError(403, "PDF file is required."));

      const { header, order, fileName } = req.body;
      if (!header) return res.status(400).json(new ApiError(400, "Header ID is required."));
      if (!fileName) return res.status(400).json(new ApiError(400, "File name is required."));

      const result = await PdfService.create({ url, fileName, header, order });
      return res.status(201).json(new ApiResponse(201, result, "PDF created successfully"));
    } catch (err) {
      next(err);
    }
  }


  static async getAllPdfs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const headerId = req.query.headerId as string;

      const pipeline: any[] = [];

      // Add filter by headerId if provided
      if (headerId && mongoose.Types.ObjectId.isValid(headerId)) {
        pipeline.push({
          $match: {
            header: new mongoose.Types.ObjectId(headerId),
          },
        });
      }

      pipeline.push(
        {
          $lookup: {
            from: "headers",
            localField: "header",
            foreignField: "_id",
            as: "headerDetails",
          },
        },
        {
          $unwind: {
            path: "$headerDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            url: 1,
            fileName: 1,
            header: "$headerDetails",
            order: 1,
            startDate: 1,
            description: 1,
            createdAt: 1,
            updatedAt: 1,
            __v: 1,
          },
        },
        { $skip: skip },
        { $limit: limit }
      );

      const data = await Pdf.aggregate(pipeline);
      
      // Get total count with the same filter
      let totalCount = await Pdf.countDocuments();
      if (headerId && mongoose.Types.ObjectId.isValid(headerId)) {
        totalCount = await Pdf.countDocuments({
          header: new mongoose.Types.ObjectId(headerId),
        });
      }

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            result: data,
            pagination: {
              totalItems: totalCount,
              currentPage: page,
              itemsPerPage: limit,
              totalPages: Math.ceil(totalCount / limit),
            },
          },
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
      const pipeline: any[] = [
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: "headers",
            localField: "header",
            foreignField: "_id",
            as: "headerDetails",
          },
        },
        {
          $unwind: {
            path: "$headerDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            url: 1,
            fileName: 1,
            header: "$headerDetails",
            order: 1,
            startDate: 1,
            description: 1,
            createdAt: 1,
            updatedAt: 1,
            __v: 1,
          },
        },
      ];

      const result = await Pdf.aggregate(pipeline);
      if (!result || result.length === 0) {
        return res.status(404).json(
          new ApiError(404, "PDF not found")
        );
      }
      
      return res.status(200).json(
        new ApiResponse(200, result[0], "PDF fetched successfully")
      );
    } catch (err: any) {
      if (err.message === "Record not found") {
        return res.status(404).json(
          new ApiError(404, "PDF not found")
        );
      }
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
