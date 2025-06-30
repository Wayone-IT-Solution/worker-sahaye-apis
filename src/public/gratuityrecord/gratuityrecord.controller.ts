import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { differenceInYears, parseISO } from "date-fns";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { GratuityRecord } from "../../modals/gratuityrecord.model";

const gratuityRecordService = new CommonService(GratuityRecord);

export class GratuityRecordController {
  static async getAllGratuityRecords(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: user, role } = (req as any).user;
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
            dateOfExit: 1,
            department: 1,
            designation: 1,
            employeeName: 1,
            dateOfJoining: 1,
            gratuityAmount: 1,
            totalYearsOfService: 1,
            "userDetails.email": 1,
            lastDrawnBasicSalary: 1,
            "userDetails.mobile": 1,
            "userDetails.fullName": 1,
          },
        },
      ];
      const result = await gratuityRecordService.getAll(
        { ...req.query, ...(role === "worker" ? { userId: user } : {}) },
        pipeline
      );
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getGratuityRecordById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await gratuityRecordService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "gratuity reference not found"));

      const record = await GratuityRecord.findOne({
        _id: req.params.id,
      }).populate("userId", "fullName email mobile");

      return res
        .status(200)
        .json(new ApiResponse(200, record, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async createGratuityRecord(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId } = (req as any).user;
      const {
        dateOfExit,
        department,
        designation,
        employeeName,
        dateOfJoining,
        lastDrawnBasicSalary,
      } = req.body;

      const doj = parseISO(dateOfJoining);
      const doe = parseISO(dateOfExit);
      const totalYearsOfService = differenceInYears(doe, doj);

      const gratuityAmount = Math.round(
        (15 / 26) * lastDrawnBasicSalary * totalYearsOfService
      );

      const record = await GratuityRecord.create({
        userId,
        department,
        designation,
        employeeName,
        gratuityAmount,
        dateOfExit: doe,
        dateOfJoining: doj,
        totalYearsOfService,
        lastDrawnBasicSalary,
      });

      return res
        .status(201)
        .json(new ApiResponse(201, record, "Gratuity calculated successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async deleteGratuityRecordById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await gratuityRecordService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete gratuity reference"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
