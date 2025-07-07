import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { Enrollment } from "../../modals/enrollment.model";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { startOfDay, subDays, parseISO, isValid } from "date-fns";
import { CommunityMember, MemberStatus } from "../../modals/communitymember.model";
import { ApplicationStatus, JobApplication } from "../../modals/jobapplication.model";

export class DashboardController {
  static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const end = endDate && isValid(new Date(endDate as string))
        ? startOfDay(parseISO(endDate as string))
        : startOfDay(new Date());

      const start = startDate && isValid(new Date(startDate as string))
        ? startOfDay(parseISO(startDate as string))
        : subDays(end, 13); // default to last 14 days

      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const dayBuckets = Array.from({ length: totalDays }, (_, i) => {
        const day = subDays(end, totalDays - 1 - i);
        return { start: day, end: new Date(day.getTime() + 86400000) }; // 24 * 60 * 60 * 1000
      });

      const getDailyAggregation = async (
        model: any,
        field: string,
        matchExtra: Record<string, any> = {}
      ): Promise<number[]> => {
        return Promise.all(
          dayBuckets.map(({ start, end }) =>
            model.aggregate([
              { $match: { createdAt: { $gte: start, $lt: end }, ...matchExtra } },
              { $group: { _id: null, total: { $sum: `$${field}` } } },
            ])
          )
        ).then((res) => res.map((r) => r[0]?.total || 0));
      };

      const getDailyCount = async (model: any, dateField: string, match: Record<string, any> = {}): Promise<number[]> => {
        return Promise.all(
          dayBuckets.map(({ start, end }) =>
            model.aggregate([
              { $match: { [dateField]: { $gte: start, $lt: end }, ...match } },
              { $group: { _id: null, count: { $sum: 1 } } },
            ])
          )
        ).then((res) => res.map((r) => r[0]?.count || 0));
      };

      const [payments, courses, activeUsers, appliedJobs, communityJoins] = await Promise.all([
        getDailyAggregation(EnrolledPlan, "finalAmount", { "paymentDetails.status": "success" }),
        getDailyAggregation(Enrollment, "finalAmount", { "paymentDetails.status": "success" }),
        getDailyCount(User, "createdAt", { userType: "worker" }),
        getDailyCount(JobApplication, "createdAt", { status: ApplicationStatus.APPLIED }),
        getDailyCount(CommunityMember, "joinedAt", { status: MemberStatus.JOINED }),
      ]);

      const totalRevenue = payments.map((_, i) => payments[i] + courses[i]);

      // Use last half and previous half for percentage comparison
      const mid = Math.floor(totalRevenue.length / 2);
      const currentRange = totalRevenue.slice(mid);
      const previousRange = totalRevenue.slice(0, mid);

      const calculateStats = (current: number[], previous: number[]) => {
        const totalCurrent = current.reduce((a, b) => a + b, 0);
        const totalPrevious = previous.reduce((a, b) => a + b, 0);
        const change =
          totalPrevious === 0 ? 100 : parseFloat(((totalCurrent - totalPrevious) / totalPrevious * 100).toFixed(2));
        return { totalCurrent, totalPrevious, percentageChange: change, chartData: current };
      };

      return res.status(200).json(
        new ApiResponse(200, {
          revenue: calculateStats(currentRange, previousRange),
          activeUsers: calculateStats(activeUsers.slice(mid), activeUsers.slice(0, mid)),
          appliedJobs: calculateStats(appliedJobs.slice(mid), appliedJobs.slice(0, mid)),
          communityJoins: calculateStats(communityJoins.slice(mid), communityJoins.slice(0, mid)),
        }, "Dashboard data fetched")
      );
    } catch (err) {
      next(err);
    }
  }
}
