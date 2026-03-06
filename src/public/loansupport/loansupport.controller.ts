import { Request, Response } from "express";
import LoanSupport, { LoanStatus, LoanPurpose } from "../../modals/loansupport.model";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { buildMatchStage, buildSortObject, buildPaginationResponse, SEARCH_FIELD_MAP } from "../../utils/queryBuilder";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { PlanType } from "../../modals/subscriptionplan.model";
import { UserSubscriptionService } from "../../services/userSubscription.service";

// Helper function to check loan application eligibility based on subscription plan
const getLoanEligibility = async (userId: string) => {
  // Get user's highest priority active subscription plan
  const enrollment = await UserSubscriptionService.getHighestPriorityPlan(userId);

  // If no active plan, user is on FREE plan - not eligible for loan application
  if (!enrollment) {
    return {
      eligible: false,
      planType: PlanType.FREE,
      message: "Loan applications are available for BASIC and PREMIUM plan members. Please upgrade your subscription to apply for a loan.",
    };
  }

  const planType = (enrollment.plan as any).planType;

  // BASIC and PREMIUM plans are eligible, FREE plan is not
  if (planType === PlanType.FREE) {
    return {
      eligible: false,
      planType: PlanType.FREE,
      message: "Loan applications are available for BASIC and PREMIUM plan members. Please upgrade your subscription to apply for a loan.",
    };
  }

  return {
    eligible: true,
    planType: planType,
    message: "You are eligible to apply for a loan.",
  };
};

export class LoanSupportController {
  static async createLoanRequest(req: Request, res: Response) {
    try {
      const { userId, fullName, email, phone, loanAmount, currentSalary, loanNeededDate, employerName, jobTitle, loanPurpose, loanCategory, reasonForLoan } = req.body;

      if (!userId || !fullName || !email || !phone || !loanAmount || !currentSalary || !loanNeededDate || !loanCategory) {
        return res.status(400).json(new ApiError(400, "All required fields must be provided"));
      }

      // Check loan application eligibility based on subscription plan
      const loanEligibility = await getLoanEligibility(userId);
      if (!loanEligibility.eligible) {
        return res.status(403).json(
          new ApiError(403, loanEligibility.message)
        );
      }

      if (loanAmount < 1000 || loanAmount > 5000000) {
        return res.status(400).json(new ApiError(400, "Loan amount must be between 1K and 50L"));
      }

      if (currentSalary <= 0) {
        return res.status(400).json(new ApiError(400, "Current salary must be greater than 0"));
      }

      if (loanPurpose && !Object.values(LoanPurpose).includes(loanPurpose)) {
        return res.status(400).json(new ApiError(400, "Invalid loan purpose"));
      }

      const newLoanRequest = new LoanSupport({
        userId,
        fullName,
        email,
        phone,
        loanAmount,
        currentSalary,
        loanNeededDate,
        employerName,
        jobTitle,
        loanPurpose,
        loanCategory,
        reasonForLoan,
        status: LoanStatus.PENDING,
      });

      await newLoanRequest.save();

      return res.status(201).json(new ApiResponse(201, newLoanRequest, "Loan request created successfully"));
    } catch (error) {
      console.error("Create Error:", error);
      return res.status(500).json(new ApiError(500, "Error creating loan request"));
    }
  }

  static async getAllLoanRequests(req: Request, res: Response) {
    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = parseInt((req.query.limit as string) || "10");
      const skip = (page - 1) * limit;

      const matchStage = buildMatchStage(
        {
          status: req.query.status as string,
          search: req.query.search as string,
          searchKey: req.query.searchKey as string,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
        },
        SEARCH_FIELD_MAP.loansupport
      );

      // Add loanPurpose filter if provided
      if (req.query.loanPurpose) {
        matchStage.loanPurpose = req.query.loanPurpose;
      }

      const sortObj = buildSortObject(
        req.query.sortKey as string,
        req.query.sortDir as string,
        { createdAt: -1 }
      );

      const totalCount = await LoanSupport.countDocuments(matchStage);
      const data = await LoanSupport.find(matchStage)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      const response = buildPaginationResponse(data, totalCount, page, limit);
      return res.status(200).json(new ApiResponse(200, response, "Loan requests fetched successfully"));
    } catch (error) {
      console.error("Fetch Error:", error);
      return res.status(500).json(new ApiError(500, "Error fetching loan requests"));
    }
  }

  static async getLoanRequestById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const loanRequest = await LoanSupport.findById(id);

      if (!loanRequest) {
        return res.status(404).json(new ApiError(404, "Loan request not found"));
      }

      return res.status(200).json(new ApiResponse(200, loanRequest, "Loan request fetched successfully"));
    } catch (error) {
      console.error("Fetch by ID Error:", error);
      return res.status(500).json(new ApiError(500, "Error fetching loan request"));
    }
  }

  static async updateLoanRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.loanPurpose && !Object.values(LoanPurpose).includes(updateData.loanPurpose)) {
        return res.status(400).json(new ApiError(400, "Invalid loan purpose"));
      }

      if (updateData.loanAmount && (updateData.loanAmount < 1000 || updateData.loanAmount > 5000000)) {
        return res.status(400).json(new ApiError(400, "Loan amount must be between 1K and 50L"));
      }

      const updatedLoanRequest = await LoanSupport.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

      if (!updatedLoanRequest) {
        return res.status(404).json(new ApiError(404, "Loan request not found"));
      }

      return res.status(200).json(new ApiResponse(200, updatedLoanRequest, "Loan request updated successfully"));
    } catch (error) {
      console.error("Update Error:", error);
      return res.status(500).json(new ApiError(500, "Error updating loan request"));
    }
  }

  static async approveLoanRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approvedAmount, approvalNotes } = req.body;

      if (!approvedAmount) {
        return res.status(400).json(new ApiError(400, "Approved amount is required"));
      }

      const updatedLoanRequest = await LoanSupport.findByIdAndUpdate(
        id,
        {
          status: LoanStatus.APPROVED,
          approvedAmount,
          approvalNotes,
          approvedDate: new Date(),
        },
        { new: true }
      );

      if (!updatedLoanRequest) {
        return res.status(404).json(new ApiError(404, "Loan request not found"));
      }

      return res.status(200).json(new ApiResponse(200, updatedLoanRequest, "Loan request approved successfully"));
    } catch (error) {
      console.error("Approve Error:", error);
      return res.status(500).json(new ApiError(500, "Error approving loan request"));
    }
  }

  static async rejectLoanRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res.status(400).json(new ApiError(400, "Rejection reason is required"));
      }

      const updatedLoanRequest = await LoanSupport.findByIdAndUpdate(
        id,
        {
          status: LoanStatus.REJECTED,
          rejectionReason,
        },
        { new: true }
      );

      if (!updatedLoanRequest) {
        return res.status(404).json(new ApiError(404, "Loan request not found"));
      }

      return res.status(200).json(new ApiResponse(200, updatedLoanRequest, "Loan request rejected successfully"));
    } catch (error) {
      console.error("Reject Error:", error);
      return res.status(500).json(new ApiError(500, "Error rejecting loan request"));
    }
  }

  static async deleteLoanRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deletedLoanRequest = await LoanSupport.findByIdAndDelete(id);

      if (!deletedLoanRequest) {
        return res.status(404).json(new ApiError(404, "Loan request not found"));
      }

      return res.status(200).json(new ApiResponse(200, deletedLoanRequest, "Loan request deleted successfully"));
    } catch (error) {
      console.error("Delete Error:", error);
      return res.status(500).json(new ApiError(500, "Error deleting loan request"));
    }
  }

  static async getLoanStatistics(req: Request, res: Response) {
    try {
      const statistics = await LoanSupport.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            approved: [{ $match: { status: LoanStatus.APPROVED } }, { $count: "count" }],
            rejected: [{ $match: { status: LoanStatus.REJECTED } }, { $count: "count" }],
            pending: [{ $match: { status: LoanStatus.PENDING } }, { $count: "count" }],
            totalAmount: [{ $group: { _id: null, total: { $sum: "$loanAmount" } } }],
            avgAmount: [{ $group: { _id: null, avg: { $avg: "$loanAmount" } } }],
          },
        },
      ]);

      const stats = {
        totalRequests: statistics[0].total[0]?.count || 0,
        approvedRequests: statistics[0].approved[0]?.count || 0,
        rejectedRequests: statistics[0].rejected[0]?.count || 0,
        pendingRequests: statistics[0].pending[0]?.count || 0,
        totalLoanAmount: statistics[0].totalAmount[0]?.total || 0,
        averageLoanAmount: statistics[0].avgAmount[0]?.avg || 0,
      };

      return res.status(200).json(new ApiResponse(200, stats, "Loan statistics fetched successfully"));
    } catch (error) {
      console.error("Statistics Error:", error);
      return res.status(500).json(new ApiError(500, "Error fetching loan statistics"));
    }
  }

  static async checkLoanEligibility(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(400).json(new ApiError(400, "User ID is required"));
      }

      const eligibility = await getLoanEligibility(userId);
      return res.status(200).json(
        new ApiResponse(200, eligibility, "Loan eligibility checked successfully")
      );
    } catch (error) {
      console.error("Eligibility Check Error:", error);
      return res.status(500).json(new ApiError(500, "Error checking loan eligibility"));
    }
  }
}
