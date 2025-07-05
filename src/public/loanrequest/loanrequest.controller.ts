import { NextFunction, Request, Response } from "express";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { CommonService } from "../../services/common.services";
import { LoanRequestModel } from "../../modals/loanrequest.model";
import {
  EnrolledPlan,
  PlanEnrollmentStatus,
} from "../../modals/enrollplan.model";

const loanRequestService = new CommonService(LoanRequestModel);

export const createLoanRequest = async (req: Request, res: Response) => {
  try {
    const { id: user } = (req as any).user;
    if (!user) return res.status(401).json(new ApiError(401, "Unauthorized"));

    const enrolled = await EnrolledPlan.findOne({
      user,
      status: PlanEnrollmentStatus.ACTIVE,
    });
    if (!enrolled)
      return res
        .status(403)
        .json(new ApiError(403, "You must enroll in a plan to request a loan"));

    const loan = await loanRequestService.create({ ...req.body, user });
    if (!loan) {
      return res
        .status(400)
        .json(new ApiError(400, "Failed to create loan request"));
    }
    return res
      .status(201)
      .json(new ApiResponse(201, loan, "Loan request submitted successfully"));
  } catch (error) {
    return res.status(500).json({ error: "Could not create loan request" });
  }
};

export const getAllLoanRequests = async (req: Request, res: Response) => {
  try {
    const { id: user } = (req as any).user;
    if (!user) return res.status(401).json(new ApiError(401, "Unauthorized"));

    const enrolled = await EnrolledPlan.findOne({
      user,
      status: PlanEnrollmentStatus.ACTIVE,
    });
    if (!enrolled)
      return res
        .status(403)
        .json(new ApiError(403, "You must enroll in a plan to request a loan"));

    const result = await loanRequestService.getAll({ ...req.query, user });
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Data fetched successfully"));
  } catch (error) {
    return res.status(500).json({ error: "Could not fetch loan requests" });
  }
};

export const getAllRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $lookup: {
          from: "fileuploads",
          let: { userId: "$user" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$refId", "$$userId"] },
                    { $eq: ["$tag", "profilePic"] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "userByProfile",
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          emailId: 1,
          createdAt: 1,
          updatedAt: 1,
          isHighRisk: 1,
          companyName: 1,
          mobileNumber: 1,
          loanNeedDate: 1,
          loanCategory: 1,
          currentSalary: 1,
          "userDetails.email": 1,
          "userDetails.mobile": 1,
          "userDetails.fullName": 1,
          estimatedLoanEligibility: 1,
          "userByProfile": { $arrayElemAt: ["$userByProfile.url", 0] },
        },
      },
    ];
    const result = await loanRequestService.getAll(req.query, pipeline);
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Data fetched successfully"));
  } catch (err) {
    next(err);
  }
}
