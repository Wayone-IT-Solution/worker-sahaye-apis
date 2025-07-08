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
import { ForumPost } from "../../modals/forumpost.model";

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
      const [payments, courses, activeUsers, appliedJobs, communityJoins, posts] =
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
        ]);

      const totalRevenue = payments.map((_, i) => payments[i] + courses[i]);

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
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
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
        "open",
        "closed",
        "on_hold",
        "resolved",
        "in_progress",
        "re_assigned",
      ];

      const [currentCounts, previousCounts] = await Promise.all([
        Ticket.aggregate([
          { $match: { createdAt: currentRange } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Ticket.aggregate([
          { $match: { createdAt: prevRange } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      const currentMap = Object.fromEntries(
        statuses.map((status) => [status, 0])
      );
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
      console.error("Error getting ticket summary:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getJobApplicationsStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
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

      const [currentCounts, previousCounts] = await Promise.all([
        JobApplication.aggregate([
          { $match: { createdAt: currentRange } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        JobApplication.aggregate([
          { $match: { createdAt: prevRange } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      const currentMap = Object.fromEntries(
        statuses.map((status) => [status, 0])
      );
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
      console.error("Error getting ticket summary:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getUserTypeCounts(req: Request, res: Response, next: NextFunction) {
    try {
      const userTypes = ["worker", "employer", "contractor"];
      const counts = await Promise.all(
        userTypes.map((type) =>
          User.countDocuments({ userType: type, status: "active" })
        )
      );
      return res.status(200).json(
        new ApiResponse(200, counts, "Active user type counts fetched")
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

      const [
        enrollmentCurrent,
        enrolledPlanCurrent,
        enrollmentPrevious,
        enrolledPlanPrevious,
      ] = await Promise.all([
        getMonthlyRevenue(Enrollment, currentYear),
        getMonthlyRevenue(EnrolledPlan, currentYear),
        getMonthlyRevenue(Enrollment, previousYear),
        getMonthlyRevenue(EnrolledPlan, previousYear),
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
      const totalCurrent = totalEnrollmentCurrent + totalEnrolledPlanCurrent;
      const totalPrevious = totalEnrollmentPrevious + totalEnrolledPlanPrevious;

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

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            currentYear,
            previousYear,
            totalEnrollmentCurrent,
            totalEnrollmentPrevious,
            totalEnrolledPlanCurrent,
            totalEnrolledPlanPrevious,
            totalCurrent,
            totalPrevious,
            percentageChange,
            enrollmentPercentageChange,
            enrolledPlanPercentageChange,
            monthlyData: {
              [currentYear]: {
                enrollment: enrollmentCurrent,
                enrolledPlan: enrolledPlanCurrent,
                combined: currentCombined,
              },
              [previousYear]: {
                enrollment: enrollmentPrevious,
                enrolledPlan: enrolledPlanPrevious,
                combined: previousCombined,
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
}