import ApiResponse from "../../utils/ApiResponse";
import FileUpload from "../../modals/fileupload.model";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const fileUploadService = new CommonService(FileUpload);

export const FileUploadController = {
  createFileUpload: async (req: Request, res: Response) => {
    try {
      const files = req.body.files;
      const userId = (req as any).user?.id;

      if (!Array.isArray(files) || files.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No files uploaded." });
      }

      const uploads = await Promise.all(
        files.map((file: any) => {
          const s3Key = file.url.split(".com/")[1];
          return FileUpload.create({
            s3Key,
            userId,
            url: file.url,
            sizeInBytes: file.size,
            mimeType: file.mimetype,
            tag: file.tags || "other",
            originalName: file.originalname,
          });
        })
      );
      res.status(201).json({ success: true, data: uploads });
    } catch (error) {
      console.log("Upload Save Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save file metadata.",
        error: (error as Error).message,
      });
    }
  },

  getAllFileUploads: async (_req: Request, res: Response) => {
    const { id: user } = (_req as any).user;
    const uploads = await FileUpload.find(
      { userId: user },
      { _id: 1, tag: 1, s3Key: 1, url: 1 }
    );
    res.json({ success: true, data: uploads });
  },

  getAllAdminFileUploads: async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $project: {
            _id: 1,
            tag: 1,
            url: 1,
            s3Key: 1,
            mimeType: 1,
            uploadedAt: 1,
            sizeInBytes: 1,
            originalName: 1,
            paymentDetails: 1,
            "userDetails.email": 1,
            "userDetails.mobile": 1,
            "userDetails.fullName": 1,
          },
        },
      ];
      const result = await fileUploadService.getAll(_req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (error) {
      next(error);
    }
  },

  deleteFileUploadById: async (req: Request, res: Response) => {
    try {
      const { key } = req.body;
      const userId = (req as any).user?.id;

      const file = await FileUpload.findOne({ s3Key: key, userId: userId });
      if (!file)
        return res
          .status(404)
          .json({ success: false, message: "File not found" });

      await deleteFromS3(file.s3Key);
      await file.deleteOne();
      res.json({ success: true, message: "File deleted from DB and S3" });
    } catch (error) {
      console.log("Delete Error:", error);
      res
        .status(500)
        .json({ success: false, message: "Deletion failed", error });
    }
  },

  deleteFileUploadByAdminId: async (req: Request, res: Response) => {
    try {
      const fileId = req.params.id;
      if (!fileId)
        return res.status(400).json({ success: false, message: "File ID is required" });

      const file = await FileUpload.findById(fileId);
      if (!file) return res.status(404).json({ success: false, message: "File not found" });

      try {
        await deleteFromS3(file.s3Key);
      } catch (s3Error) {
        // console.warn("S3 deletion failed, proceeding with DB deletion:", s3Error);
      }
      await file.deleteOne();
      return res.status(200).json({
        success: true,
        message: "File successfully deleted from DB and S3",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Deletion failed",
        error: (error as Error).message || "Unknown error",
      });
    }
  }
};
