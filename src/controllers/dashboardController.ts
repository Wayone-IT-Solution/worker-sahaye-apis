import Ticket from "../modals/ticketModel";
import Passenger from "../modals/passengerModal";
import { Ride, RideStatus } from "../modals/rideModel";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { Request, Response, NextFunction } from "express";

export class DashboardController {
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

  static async getRideStatusSummary(
    _req: Request,
    res: Response,
    _next: NextFunction
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

      const statuses = Object.values(RideStatus);

      const [currentCounts, previousCounts] = await Promise.all([
        Ride.aggregate([
          { $match: { createdAt: currentRange } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Ride.aggregate([
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
      console.error("Error getting ride status summary:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getRideStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { all, year } = req.query;

      let years: number[] = [];
      if (typeof year === "string") {
        years = year
          .split(",")
          .map((y) => parseInt(y.trim()))
          .filter((y) => !isNaN(y));
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const previousYear = currentYear - 1;

      if (all === "true") {
        years = []; // no filter, all data
      } else if (years.length === 0) {
        years = [previousYear, currentYear];
      }

      let matchCondition: any = { status: RideStatus.COMPLETED };

      if (years.length > 0) {
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        matchCondition.completedAt = {
          $gte: new Date(`${minYear}-01-01T00:00:00Z`),
          $lte: new Date(`${maxYear}-12-31T23:59:59Z`),
        };
      }

      const ridesAggregation = await Ride.aggregate([
        { $match: matchCondition },
        {
          $project: {
            year: { $year: "$completedAt" },
            fare: 1,
            paymentMode: 1,
            passengerId: 1,
          },
        },
        {
          $group: {
            _id: { year: "$year", paymentMode: "$paymentMode" },
            totalRevenue: { $sum: { $ifNull: ["$fare", 0] } },
            rideCount: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1 } },
      ]);

      const completedRidesCount = await Ride.aggregate([
        { $match: matchCondition },
        {
          $project: {
            year: { $year: "$completedAt" },
          },
        },
        {
          $group: {
            _id: "$year",
            totalCompletedRides: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const passengerIds = await Ride.distinct("user", matchCondition);

      const totalPassengers = await Passenger.countDocuments({
        _id: { $in: passengerIds },
      });

      type YearlyRevenue = Record<
        number,
        {
          online: number;
          cash: number;
          totalRidesByPaymentMode: number;
          totalCompletedRides?: number;
        }
      >;

      const yearlyRevenue: YearlyRevenue = {};

      ridesAggregation.forEach(({ _id, totalRevenue, rideCount }) => {
        const year = _id.year;
        const paymentMode = _id.paymentMode as "cash" | "online";

        if (!yearlyRevenue[year]) {
          yearlyRevenue[year] = {
            online: 0,
            cash: 0,
            totalRidesByPaymentMode: 0,
          };
        }
        if (paymentMode === "cash") {
          yearlyRevenue[year].cash = totalRevenue;
        } else if (paymentMode === "online") {
          yearlyRevenue[year].online = totalRevenue;
        }
        yearlyRevenue[year].totalRidesByPaymentMode += rideCount;
      });

      completedRidesCount.forEach(({ _id: year, totalCompletedRides }) => {
        if (!yearlyRevenue[year]) {
          yearlyRevenue[year] = {
            online: 0,
            cash: 0,
            totalRidesByPaymentMode: 0,
          };
        }
        yearlyRevenue[year].totalCompletedRides = totalCompletedRides;
      });

      Object.keys(yearlyRevenue).forEach((year) => {
        if (!yearlyRevenue[+year].totalCompletedRides) {
          yearlyRevenue[+year].totalCompletedRides = 0;
        }
      });

      // Prepare ordered years list to calculate percentage changes correctly
      const yearsToUse =
        all === "true" ? Object.keys(yearlyRevenue).map(Number).sort() : years;

      function percentChange(
        current: number,
        previous: number | undefined
      ): number {
        if (previous === undefined || previous === 0) {
          return current === 0 ? 0 : 100; // No previous data or zero means full increase if current > 0
        }
        return ((current - previous) / previous) * 100;
      }

      type YearlyStatsWithChange = {
        onlineRevenue: number;
        cashRevenue: number;
        totalCompletedRides: number;

        onlineRevenueChange: number | null;
        cashRevenueChange: number | null;
        completedRidesChange: number | null;
      };

      const responseData: Record<number, YearlyStatsWithChange> = {};

      for (let i = 0; i < yearsToUse.length; i++) {
        const year = yearsToUse[i];
        const prevYear = yearsToUse[i - 1];

        const currentData = yearlyRevenue[year] || {
          online: 0,
          cash: 0,
          totalCompletedRides: 0,
        };
        const prevData = prevYear ? yearlyRevenue[prevYear] : undefined;

        responseData[year] = {
          onlineRevenue: currentData.online,
          cashRevenue: currentData.cash,
          totalCompletedRides: currentData.totalCompletedRides!,

          onlineRevenueChange: prevData
            ? percentChange(currentData.online, prevData.online)
            : percentChange(currentData.online, 0),
          cashRevenueChange: prevData
            ? percentChange(currentData.cash, prevData.cash)
            : percentChange(currentData.cash, 0),
          completedRidesChange: prevData
            ? percentChange(
                currentData.totalCompletedRides!,
                prevData.totalCompletedRides
              )
            : percentChange(currentData.totalCompletedRides!, 0),
        };
      }

      res.status(200).json({
        totalPassengers,
        success: true,
        yearlyStats: responseData,
      });
    } catch (error) {
      console.error("Error fetching ride stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
