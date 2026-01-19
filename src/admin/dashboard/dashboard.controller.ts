import { Types } from "mongoose";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { Enrollment } from "../../modals/enrollment.model";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import {
  subDays,
  isValid,
  parseISO,
  endOfDay,
  formatISO,
  startOfDay,
} from "date-fns";
import {
  JobApplication,
  ApplicationStatus,
} from "../../modals/jobapplication.model";
import {
  MemberStatus,
  CommunityMember,
} from "../../modals/communitymember.model";
import Ticket from "../../modals/ticket.model";
import { Badge } from "../../modals/badge.model";
import { Booking } from "../../modals/booking.model";
import { ForumPost } from "../../modals/forumpost.model";
import { IVRCallModel } from "../../modals/ivrcall.model";
import { TopRecruiter } from "../../modals/toprecruiter.model";
import { FastResponder } from "../../modals/fastresponder.model";
import { ReliablePayer } from "../../modals/reliablepayer.model";
import { SafeWorkplace } from "../../modals/safeworkplace.model";
import { TrainedWorker } from "../../modals/trainedworker.model";
import { BulkHiringRequest } from "../../modals/bulkhiring.model";
import { PreInterviewed } from "../../modals/preinterviewd.model";
import { LoanRequestModel } from "../../modals/loanrequest.model";
import { JobRequirement } from "../../modals/jobrequirement.model";
import { TrustedPartner } from "../../modals/trustedpartner.model";
import { HighlyPreferred } from "../../modals/highlypreferred.model";
import { SkilledCandidate } from "../../modals/skilledcandidate.model";
import { UnifiedServiceRequest } from "../../modals/unifiedrequest.model";
import { ProjectBasedHiring } from "../../modals/projectbasedhiring.model";
import { PoliceVerification } from "../../modals/policeverification.model";
import { ComplianceChecklist } from "../../modals/compliancechecklist.model";
import { BestPracticesFacility } from "../../modals/bestpracticesfacility.model";
import { PreInterviewedContractor } from "../../modals/preinterviewedcontractor.model";
import { Quotation, QuotationStatus, RequestModelType } from "../../modals/quotation.model";
import { VirtualHRRequest, VirtualHRRequestStatus } from "../../modals/virtualhrrequest.model";
import { VirtualHrRecruiter } from "../../modals/virtualhrecruiter.model";
import { Job } from "../../modals/job.model";

export class DashboardController {
  static async getDashboardStats(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { startDate, endDate } = req.query;

      const end =
        endDate && isValid(new Date(endDate as string))
          ? startOfDay(parseISO(endDate as string))
          : startOfDay(new Date());

      const start =
        startDate && isValid(new Date(startDate as string))
          ? startOfDay(parseISO(startDate as string))
          : subDays(end, 13);

      const totalDays =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;
      const extendedStart = subDays(start, totalDays); // Previous period

      // Common helper
      const aggregateDaily = async (
        model: any,
        dateField: string,
        sumField?: string,
        match: any = {}
      ): Promise<number[]> => {
        const pipeline: any[] = [
          {
            $match: {
              [dateField]: { $gte: extendedStart, $lte: end },
              ...match,
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` },
              },
              value: sumField ? { $sum: `$${sumField}` } : { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ];

        const result = await model.aggregate(pipeline);

        // Create a lookup map for fast access
        const lookup: any = new Map(result.map((r: any) => [r._id, r.value]));

        // Fill all days (totalDays * 2)
        const buckets: number[] = [];
        for (let i = totalDays * 2 - 1; i >= 0; i--) {
          const day = subDays(end, i);
          const key = formatISO(day, { representation: "date" });
          buckets.push(lookup.get(key) || 0);
        }

        return buckets;
      };

      // Fetch all in parallel
      const [payments, courses, activeUsers, appliedJobs, communityJoins, posts, personalAssistance] =
        await Promise.all([
          aggregateDaily(EnrolledPlan, "createdAt", "finalAmount", {
            "paymentDetails.status": "success",
          }),
          aggregateDaily(Enrollment, "createdAt", "finalAmount", {
            "paymentDetails.status": "success",
          }),
          aggregateDaily(User, "createdAt", undefined, { userType: "worker" }),
          aggregateDaily(JobApplication, "createdAt", undefined, {
            status: ApplicationStatus.APPLIED,
          }),
          aggregateDaily(CommunityMember, "joinedAt", undefined, {
            status: MemberStatus.JOINED,
          }),
          aggregateDaily(ForumPost, "createdAt", undefined, {
            status: "active",
          }),
          aggregateDaily(Booking, "createdAt", "totalAmount", {
            "paymentStatus": "success",
          }),
        ]);
      const totalRevenue = payments.map((_, i) => payments[i] + courses[i] + personalAssistance[i]);

      const prevIndex = 0;
      const currIndex = totalDays;

      const calculateStats = (data: number[]) => {
        const previous = data.slice(prevIndex, currIndex);
        const current = data.slice(currIndex);
        const totalCurrent = current.reduce((a, b) => a + b, 0);
        const totalPrevious = previous.reduce((a, b) => a + b, 0);

        let percentageChange = 0;
        if (totalPrevious === 0 && totalCurrent > 0) percentageChange = 100;
        else if (totalPrevious === 0 && totalCurrent === 0)
          percentageChange = 0;
        else if (totalPrevious === 0 && totalCurrent < 0)
          percentageChange = -100;
        else
          percentageChange = +(
            ((totalCurrent - totalPrevious) / totalPrevious) *
            100
          ).toFixed(2);

        return {
          totalCurrent,
          totalPrevious,
          percentageChange,
          chartData: current,
        };
      };

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            posts: calculateStats(posts),
            revenue: calculateStats(totalRevenue),
            activeUsers: calculateStats(activeUsers),
            appliedJobs: calculateStats(appliedJobs),
            communityJoins: calculateStats(communityJoins),
          },
          "Dashboard data fetched"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getCustomerSupportDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate: start, endDate: end, assigneeId } = req.query;

      const endDate = end ? new Date(end as string) : new Date();
      const startDate = start ? new Date(start as string) : subDays(endDate, 7);

      const prevEndDate = subDays(startDate, 1);
      const prevStartDate = subDays(startDate, 7);

      const currentRange = {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      };

      const prevRange = {
        $gte: startOfDay(prevStartDate),
        $lte: endOfDay(prevEndDate),
      };

      const statuses = [
        "open",
        "closed",
        "on_hold",
        "resolved",
        "in_progress",
        "re_assigned",
      ];

      // 👇 Build match condition dynamically
      const buildMatchStage = (dateRange: any) => {
        const match: any = { createdAt: dateRange };
        if (assigneeId) match["assignee"] = new Types.ObjectId(assigneeId as string);
        return { $match: match };
      };

      const [currentCounts, previousCounts] = await Promise.all([
        Ticket.aggregate([
          buildMatchStage(currentRange),
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Ticket.aggregate([
          buildMatchStage(prevRange),
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      const currentMap = Object.fromEntries(statuses.map((status) => [status, 0]));
      const prevMap = { ...currentMap };

      currentCounts.forEach(({ _id, count }) => (currentMap[_id] = count));
      previousCounts.forEach(({ _id, count }) => (prevMap[_id] = count));

      const result = statuses.reduce((acc, status) => {
        const current = currentMap[status];
        const previous = prevMap[status];
        const percentageChange =
          previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

        acc[status] = current;
        acc[`${status}_change`] = parseFloat(percentageChange.toFixed(2));
        return acc;
      }, {} as Record<string, number>);

      res.status(200).json({
        success: true,
        from: startOfDay(startDate),
        to: endOfDay(endDate),
        ...result,
      });
    } catch (error) {
      console.error("Error getting ticket summary:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getIvrCallSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate: start, endDate: end, pickedBy, featureId } = req.query;

      const endDate = end ? new Date(end as string) : new Date();
      const startDate = start ? new Date(start as string) : subDays(endDate, 7);

      const prevEndDate = subDays(startDate, 1);
      const prevStartDate = subDays(startDate, 7);

      const currentRange = {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      };

      const prevRange = {
        $gte: startOfDay(prevStartDate),
        $lte: endOfDay(prevEndDate),
      };

      const statuses = [
        "answered",
        "initiated",
        "no_answer",
        "in_progress",
      ];

      const buildMatchStage = (dateRange: any) => {
        const match: any = { createdAt: dateRange };
        if (pickedBy) match["pickedBy"] = new Types.ObjectId(pickedBy as string);
        if (featureId) match["featureId"] = new Types.ObjectId(featureId as string);
        return { $match: match };
      };

      const [currentCounts, previousCounts] = await Promise.all([
        IVRCallModel.aggregate([
          buildMatchStage(currentRange),
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        IVRCallModel.aggregate([
          buildMatchStage(prevRange),
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      const currentMap = Object.fromEntries(statuses.map((s) => [s, 0]));
      const prevMap = { ...currentMap };

      currentCounts.forEach(({ _id, count }) => (currentMap[_id] = count));
      previousCounts.forEach(({ _id, count }) => (prevMap[_id] = count));

      const result = statuses.reduce((acc, status) => {
        const current = currentMap[status];
        const previous = prevMap[status];
        const change =
          previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

        acc[status] = current;
        acc[`${status}_change`] = parseFloat(change.toFixed(2));
        return acc;
      }, {} as Record<string, number>);

      res.status(200).json({
        success: true,
        from: startOfDay(startDate),
        to: endOfDay(endDate),
        ...result,
      });
    } catch (err) {
      console.error("IVR Analytics Error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getJobApplicationsStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: userId, role } = (_req as any).user;
      const { startDate: start, endDate: end } = _req.query;

      const endDate = end ? new Date(end as string) : new Date();
      const startDate = start ? new Date(start as string) : subDays(endDate, 7);

      const prevEndDate = subDays(startDate, 1);
      const prevStartDate = subDays(startDate, 7);

      const currentRange = {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      };

      const prevRange = {
        $gte: startOfDay(prevStartDate),
        $lte: endOfDay(prevEndDate),
      };

      const statuses = [
        "hired",
        "applied",
        "offered",
        "rejected",
        "interview",
        "withdrawn",
        "shortlisted",
        "under_review",
        "offer_declined",
        "offer_accepted",
      ];

      const basePipeline = (dateRange: any) => {
        const pipeline: any[] = [
          { $match: { createdAt: dateRange, } },
          {
            $lookup: {
              from: "jobs",
              localField: "job",
              foreignField: "_id",
              as: "job",
            },
          },
          { $unwind: "$job" },
        ];
        // Apply filter only if not admin
        if (role !== "admin") {
          pipeline.push({
            $match: {
              "job.createdBy": userId,
            },
          });
        }
        pipeline.push({
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        });
        return pipeline;
      };

      const [currentCounts, previousCounts] = await Promise.all([
        JobApplication.aggregate(basePipeline(currentRange)),
        JobApplication.aggregate(basePipeline(prevRange)),
      ]);

      const currentMap = Object.fromEntries(statuses.map((s) => [s, 0]));
      const prevMap = { ...currentMap };

      currentCounts.forEach(({ _id, count }) => (currentMap[_id] = count));
      previousCounts.forEach(({ _id, count }) => (prevMap[_id] = count));

      const result = statuses.reduce((acc, status) => {
        const current = currentMap[status];
        const previous = prevMap[status];
        const percentageChange =
          previous === 0
            ? current > 0
              ? 100
              : 0
            : ((current - previous) / previous) * 100;

        acc[status] = current;
        acc[`${status}_change`] = parseFloat(percentageChange.toFixed(2));
        return acc;
      }, {} as Record<string, number>);

      res.status(200).json({
        success: true,
        from: startOfDay(startDate),
        to: endOfDay(endDate),
        ...result,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getUserStatsByTypeAndStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userTypes = ["worker", "employer", "contractor"];

      let grandActive = 0;
      let grandInactive = 0;
      const stats = await Promise.all(
        userTypes.map(async (type) => {
          const [active, inactive] = await Promise.all([
            User.countDocuments({ userType: type, status: "active" }),
            User.countDocuments({ userType: type, status: "inactive" }),
          ]);

          grandActive += active;
          grandInactive += inactive;

          return {
            userType: type,
            active,
            inactive,
            total: active + inactive,
          };
        })
      );
      const grandTotal = {
        active: grandActive,
        inactive: grandInactive,
        total: grandActive + grandInactive,
      };
      return res
        .status(200)
        .json(
          new ApiResponse(200, { stats, grandTotal }, "User stats by type and total fetched")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getCurrentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userTypes = ["worker", "employer", "contractor"];
      const counts = await Promise.all(
        userTypes.map(async (type) => {
          const count = await User.countDocuments({ userType: type, status: "active" });
          return { title: type, count };
        })
      );
      const { role, id: userId } = (req as any).user;

      // Fetch total jobs and companies
      const totalJobs = await Job.countDocuments({ status: "open" });
      const totalCompanies = await User.countDocuments({ userType: "employer", status: "active" });

      const allRoleBadges = await Badge.find({ userTypes: role }).lean();
      const totalBadges = allRoleBadges.length;

      const badgeIdToKeyMap = new Map<string, string>();
      allRoleBadges.forEach((badge) => {
        badgeIdToKeyMap.set(badge.slug, badge.name);
      });

      const statusMap = new Map<string, string>();
      const pendingBadgeModels: Record<string, any> = {
        "top_recruiter": TopRecruiter,
        "reliable_payer": ReliablePayer,
        "safe_workplace": SafeWorkplace,
        "fast_responder": FastResponder,
        "trusted_partner": TrustedPartner,
        "highly_preferred": HighlyPreferred,
        "police_verified": PoliceVerification,
        "skilled_candidate": SkilledCandidate,
        "compliance_pro": ComplianceChecklist,
        "trained_by_worker_sahaye": TrainedWorker,
        "pre_interviewed_candidate": PreInterviewed,
        "best_facility__practices": BestPracticesFacility,
        "pre_screened_contractor": PreInterviewedContractor,
      };

      const pendingResults = await Promise.all(
        Object.entries(pendingBadgeModels)
          .filter(([badgeKey]) => badgeIdToKeyMap.has(badgeKey))
          .map(async ([badgeKey, Model]) => {
            const record = await Model.findOne({ user: userId }, { status: 1 }).lean();
            return record ? { key: badgeKey, status: record.status } : null;
          })
      );

      pendingResults.filter(Boolean).forEach(({ key, status }: any) => {
        if (!statusMap.has(key)) statusMap.set(key, status);
      });

      let approvedCount = 0;

      const badgeList = allRoleBadges.map((badge) => {
        const status = statusMap.get(badge.slug);
        const updatedStatus = status && status === "pending" ? "requested" : status || "pending";

        if (updatedStatus === "approved") approvedCount += 1;
        return { ...badge, status: updatedStatus };
      });

      const approvedBadges = badgeList
        .filter((badge: any) => badge.status === "approved")
        .map(({ _id, name }) => ({ _id, name }));

      const percentage = totalBadges === 0 ? 0 : parseFloat(((approvedCount / totalBadges) * 100).toFixed(2));
      
      // Add totalJobs to counts array
      const countsWithJobs = [
        ...counts,
        { title: "jobs", count: totalJobs }
      ];
      
      const data = {
        counts: countsWithJobs,
        percentage,
        total: totalBadges,
        badges: approvedBadges,
        approved: approvedCount,
        totalJobs,
        totalCompanies,
      };
      return res.status(200).json(
        new ApiResponse(200, data, "Active user type counts fetched")
      );
    } catch (err) {
      next(err);
    }
  }

  static async getYearlyRevenueComparison(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const yearParam =
        parseInt(req.query.year as string) || new Date().getFullYear();
      const currentYear = yearParam;
      const previousYear = currentYear - 1;

      const getMonthlyRevenue = async (
        model: any,
        year: number
      ): Promise<number[]> => {
        const pipeline = [
          {
            $match: {
              createdAt: {
                $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                $lte: new Date(`${year}-12-31T23:59:59.999Z`),
              },
              "paymentDetails.status": "success",
            },
          },
          {
            $group: {
              _id: { month: { $month: "$createdAt" } },
              total: { $sum: "$finalAmount" },
            },
          },
          { $sort: { "_id.month": 1 } },
        ];

        const result = await model.aggregate(pipeline);
        const monthlyTotals = Array(12).fill(0);
        for (const item of result) {
          const monthIndex = item._id.month - 1;
          monthlyTotals[monthIndex] = item.total;
        }

        return monthlyTotals;
      };

      const getMonthlyRevenuePersonal = async (
        model: any,
        year: number
      ): Promise<number[]> => {
        const pipeline = [
          {
            $match: {
              createdAt: {
                $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                $lte: new Date(`${year}-12-31T23:59:59.999Z`),
              },
              "paymentStatus": "success",
            },
          },
          {
            $group: {
              _id: { month: { $month: "$createdAt" } },
              total: { $sum: "$totalAmount" },
            },
          },
          { $sort: { "_id.month": 1 } },
        ];

        const result = await model.aggregate(pipeline);
        const monthlyTotals = Array(12).fill(0);
        for (const item of result) {
          const monthIndex = item._id.month - 1;
          monthlyTotals[monthIndex] = item.total;
        }
        return monthlyTotals;
      };

      const [
        enrollmentCurrent,
        enrolledPlanCurrent,
        enrollmentPrevious,
        enrolledPlanPrevious,
        personalAssistanceCurrent,
        personalAssistancePrevious,
      ] = await Promise.all([
        getMonthlyRevenue(Enrollment, currentYear),
        getMonthlyRevenue(EnrolledPlan, currentYear),
        getMonthlyRevenue(Enrollment, previousYear),
        getMonthlyRevenue(EnrolledPlan, previousYear),
        getMonthlyRevenuePersonal(Booking, currentYear),
        getMonthlyRevenuePersonal(Booking, previousYear),
      ]);

      const currentCombined = enrollmentCurrent.map(
        (val, i) => val + enrolledPlanCurrent[i]
      );
      const previousCombined = enrollmentPrevious.map(
        (val, i) => val + enrolledPlanPrevious[i]
      );

      const totalEnrollmentCurrent = enrollmentCurrent.reduce(
        (a, b) => a + b,
        0
      );
      const totalEnrollmentPrevious = enrollmentPrevious.reduce(
        (a, b) => a + b,
        0
      );
      const totalEnrolledPlanCurrent = enrolledPlanCurrent.reduce(
        (a, b) => a + b,
        0
      );
      const totalEnrolledPlanPrevious = enrolledPlanPrevious.reduce(
        (a, b) => a + b,
        0
      );
      const totalPersonalCurrent = personalAssistanceCurrent.reduce(
        (a, b) => a + b,
        0
      );
      const totalPersonalPrevious = personalAssistancePrevious.reduce(
        (a, b) => a + b,
        0
      );
      const totalCurrent = totalEnrollmentCurrent + totalEnrolledPlanCurrent + totalPersonalCurrent;
      const totalPrevious = totalEnrollmentPrevious + totalEnrolledPlanPrevious + totalPersonalPrevious;

      const getPercentageChange = (curr: number, prev: number) => {
        if (prev === 0 && curr > 0) return 100;
        if (prev === 0 && curr === 0) return 0;
        if (prev === 0 && curr < 0) return -100;
        return +(((curr - prev) / prev) * 100).toFixed(2);
      };

      const percentageChange = getPercentageChange(totalCurrent, totalPrevious);
      const enrollmentPercentageChange = getPercentageChange(
        totalEnrollmentCurrent,
        totalEnrollmentPrevious
      );
      const enrolledPlanPercentageChange = getPercentageChange(
        totalEnrolledPlanCurrent,
        totalEnrolledPlanPrevious
      );
      const personalPercentageChange = getPercentageChange(
        totalPersonalCurrent,
        totalPersonalPrevious
      );

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            currentYear,
            previousYear,
            totalPersonalCurrent,
            totalPersonalPrevious,
            totalEnrollmentCurrent,
            totalEnrollmentPrevious,
            totalEnrolledPlanCurrent,
            totalEnrolledPlanPrevious,
            totalCurrent,
            totalPrevious,
            percentageChange,
            personalPercentageChange,
            enrollmentPercentageChange,
            enrolledPlanPercentageChange,
            monthlyData: {
              [currentYear]: {
                combined: currentCombined,
                enrollment: enrollmentCurrent,
                enrolledPlan: enrolledPlanCurrent,
                personalAssistance: personalAssistanceCurrent,
              },
              [previousYear]: {
                combined: previousCombined,
                enrollment: enrollmentPrevious,
                enrolledPlan: enrolledPlanPrevious,
                personalAssistance: personalAssistancePrevious,
              },
            },
          },
          "Yearly revenue data fetched"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getBadgeStatusCounts(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate && isValid(new Date(startDate as string))
        ? startOfDay(parseISO(startDate as string))
        : undefined;

      const end = endDate && isValid(new Date(endDate as string))
        ? endOfDay(parseISO(endDate as string))
        : undefined;

      const models: Record<string, any> = {
        "top_recruiter": TopRecruiter,
        "reliable_payer": ReliablePayer,
        "safe_workplace": SafeWorkplace,
        "fast_responder": FastResponder,
        "trusted_partner": TrustedPartner,
        "highly_preferred": HighlyPreferred,
        "police_verified": PoliceVerification,
        "skilled_candidate": SkilledCandidate,
        "compliance_pro": ComplianceChecklist,
        "trained_by_worker_sahaye": TrainedWorker,
        "pre_interviewed_candidate": PreInterviewed,
        "best_facility__practices": BestPracticesFacility,
        "pre_screened_contractor": PreInterviewedContractor,
      };

      const results: Record<string, Record<string, number>> = {};

      await Promise.all(
        Object.entries(models).map(async ([key, Model]) => {
          const statusCount: Record<string, number> = {
            pending: 0,
            approved: 0,
            rejected: 0,
          };

          if (start && end) {
            // PENDING: based on createdAt
            const pendingCount = await Model.countDocuments({
              status: "pending",
              createdAt: { $gte: start, $lte: end },
            });

            // APPROVED: based on verifiedAt
            const approvedCount = await Model.countDocuments({
              status: "approved",
              verifiedAt: { $gte: start, $lte: end },
            });

            // REJECTED: based on updatedAt
            const rejectedCount = await Model.countDocuments({
              status: "rejected",
              updatedAt: { $gte: start, $lte: end },
            });

            statusCount.pending = pendingCount;
            statusCount.approved = approvedCount;
            statusCount.rejected = rejectedCount;
          } else {
            // No date filter: use overall status counts
            const counts = await Model.aggregate([
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ]);
            counts.forEach(({ _id, count }: any) => {
              if (_id in statusCount) statusCount[_id] = count;
            });
          }

          results[key] = statusCount;
        })
      );

      return res.status(200).json(new ApiResponse(200, results, "Badge status counts fetched"));
    } catch (err) {
      next(err);
    }
  }

  static async getServicesStatusCounts(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, virtualHRId } = req.query;

      const start = startDate && isValid(new Date(startDate as string))
        ? startOfDay(parseISO(startDate as string))
        : undefined;

      const end = endDate && isValid(new Date(endDate as string))
        ? endOfDay(parseISO(endDate as string))
        : undefined;

      const models: Record<string, any> = {
        "bulk_hiring": BulkHiringRequest,
        "loan_request": LoanRequestModel,
        "on_demand_hiring": JobRequirement,
        "virtual_hr_hiring": VirtualHRRequest,
        "virtual_hr_recruiter": VirtualHrRecruiter,
        "support_service": UnifiedServiceRequest,
        "project_based_hiring": ProjectBasedHiring,
      };

      const results: Record<string, Record<VirtualHRRequestStatus, number>> = {};

      await Promise.all(
        Object.entries(models).map(async ([key, Model]) => {
          const statusCount: Record<VirtualHRRequestStatus, number> = {
            [VirtualHRRequestStatus.PENDING]: 0,
            [VirtualHRRequestStatus.ASSIGNED]: 0,
            [VirtualHRRequestStatus.IN_PROGRESS]: 0,
            [VirtualHRRequestStatus.COMPLETED]: 0,
            [VirtualHRRequestStatus.CANCELLED]: 0,
          };

          const matchBase: any = {};
          if (virtualHRId) matchBase.assignedTo = virtualHRId;

          if (start && end) {
            const [pending, assigned, inProgress, completed, cancelled] = await Promise.all([
              Model.countDocuments({ ...matchBase, status: "Pending", createdAt: { $gte: start, $lte: end } }),
              Model.countDocuments({ ...matchBase, status: "Assigned", assignedAt: { $gte: start, $lte: end } }),
              Model.countDocuments({ ...matchBase, status: "In Progress", updatedAt: { $gte: start, $lte: end } }),
              Model.countDocuments({ ...matchBase, status: "Completed", completedAt: { $gte: start, $lte: end } }),
              Model.countDocuments({ ...matchBase, status: "Cancelled", updatedAt: { $gte: start, $lte: end } }),
            ]);

            statusCount[VirtualHRRequestStatus.PENDING] = pending;
            statusCount[VirtualHRRequestStatus.ASSIGNED] = assigned;
            statusCount[VirtualHRRequestStatus.IN_PROGRESS] = inProgress;
            statusCount[VirtualHRRequestStatus.COMPLETED] = completed;
            statusCount[VirtualHRRequestStatus.CANCELLED] = cancelled;
          } else {
            const matchPipeline = virtualHRId ? [{ $match: { virtualHRId } }] : [];
            const counts = await Model.aggregate([
              ...matchPipeline,
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ]);

            counts.forEach(({ _id, count }: any) => {
              if (_id in statusCount) {
                statusCount[_id as VirtualHRRequestStatus] = count;
              }
            });
          }
          results[key] = statusCount;
        })
      );

      return res.status(200).json(new ApiResponse(200, results, "Services status counts fetched"));
    } catch (err) {
      next(err);
    }
  }

  static async getQuotationsStatusCounts(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, agentId } = req.query;

      const start = startDate && isValid(new Date(startDate as string))
        ? startOfDay(parseISO(startDate as string))
        : undefined;

      const end = endDate && isValid(new Date(endDate as string))
        ? endOfDay(parseISO(endDate as string))
        : undefined;

      const models = Object.values(RequestModelType); // All models: BULK, ONDEMAND, etc.

      const results: Record<string, Record<QuotationStatus, number>> = {};

      await Promise.all(
        models.map(async (modelKey) => {
          const statusCount: Record<QuotationStatus, number> = {
            [QuotationStatus.APPROVED]: 0,
            [QuotationStatus.REJECTED]: 0,
            [QuotationStatus.COMPLETED]: 0,
            [QuotationStatus.UNDER_REVIEW]: 0,
          };

          const matchBase: any = { requestModel: modelKey };
          if (agentId) matchBase.agentId = agentId;

          if (start && end) {
            matchBase.createdAt = { $gte: start, $lte: end };

            const [approved, rejected, completed, under_review] = await Promise.all([
              Quotation.countDocuments({ ...matchBase, status: QuotationStatus.APPROVED }),
              Quotation.countDocuments({ ...matchBase, status: QuotationStatus.REJECTED }),
              Quotation.countDocuments({ ...matchBase, status: QuotationStatus.COMPLETED }),
              Quotation.countDocuments({ ...matchBase, status: QuotationStatus.UNDER_REVIEW }),
            ]);

            statusCount[QuotationStatus.APPROVED] = approved;
            statusCount[QuotationStatus.REJECTED] = rejected;
            statusCount[QuotationStatus.COMPLETED] = completed;
            statusCount[QuotationStatus.UNDER_REVIEW] = under_review;
          } else {
            const matchPipeline: any[] = [{ $match: matchBase }];
            const counts = await Quotation.aggregate([
              ...matchPipeline,
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ]);

            counts.forEach(({ _id, count }: any) => {
              if (_id in statusCount) {
                statusCount[_id as QuotationStatus] = count;
              }
            });
          }

          results[modelKey] = statusCount;
        })
      );

      return res.status(200).json(new ApiResponse(200, results, "Quotation status counts fetched"));
    } catch (err) {
      next(err);
    }
  }

  static async getQuotationAmountSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, agentId } = req.query;

      const requestModels = [
        "BulkHiringRequest",
        "VirtualHRRequest",
        "VirtualHrRecruiter",
        "JobRequirement",
        "ProjectBasedHiring",
        "UnifiedServiceRequest"
      ];

      const start = startDate && isValid(new Date(startDate as string))
        ? startOfDay(parseISO(startDate as string))
        : undefined;

      const end = endDate && isValid(new Date(endDate as string))
        ? endOfDay(parseISO(endDate as string))
        : undefined;

      const matchStage: any = {};
      if (agentId) matchStage.agentId = agentId;
      if (start && end) matchStage.createdAt = { $gte: start, $lte: end };

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: "$requestModel",
            totalAmount: { $sum: "$amount" },
            totalAdvancePaid: {
              $sum: {
                $cond: [{ $eq: ["$isAdvancePaid", true] }, "$advanceAmount", 0],
              },
            },
            quotationCount: { $sum: 1 },
            advancePaidCount: {
              $sum: { $cond: [{ $eq: ["$isAdvancePaid", true] }, 1, 0] },
            },
            advanceUnpaidCount: {
              $sum: { $cond: [{ $ne: ["$isAdvancePaid", true] }, 1, 0] },
            },
          },
        },
      ];

      const result = await Quotation.aggregate(pipeline);

      // Start with all models and fill actual data or defaults
      const formatted = requestModels.reduce((acc, model) => {
        const found = result.find((r) => r._id === model);
        acc[model] = found
          ? {
            totalAmount: found.totalAmount,
            totalAdvancePaid: found.totalAdvancePaid,
            totalPendingAdvance: found.totalAmount - found.totalAdvancePaid,
            quotationCount: found.quotationCount,
            advancePaidCount: found.advancePaidCount,
            advanceUnpaidCount: found.advanceUnpaidCount,
          }
          : {
            totalAmount: 0,
            totalAdvancePaid: 0,
            totalPendingAdvance: 0,
            quotationCount: 0,
            advancePaidCount: 0,
            advanceUnpaidCount: 0,
          };
        return acc;
      }, {} as Record<string, any>);

      return res.status(200).json(
        new ApiResponse(200, formatted, "Quotation amount summary fetched")
      );
    } catch (error) {
      next(error);
    }
  }
}