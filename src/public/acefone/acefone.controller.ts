import { NextFunction, Request, Response } from "express";
import { PipelineStage } from "mongoose";
import { User } from "../../modals/user.model";
import Admin from "../../modals/admin.model";
import Role from "../../modals/role.model";
import { acefoneService } from "../../services/acefone.service";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { IAcefoneCall, AcefoneCall } from "../../modals/acefonecall.model";
import { CommonService } from "../../services/common.services";

const acefoneCallService = new CommonService(AcefoneCall);

export class AcefoneController {
  /**
   * Initiate a Click-to-Call to a support agent
   * picks the best agent based on Round Robin (lastCallTakenAt and callTakenCount)
   */
  static async initiateSupportCall(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const authUser = (req as any).user;
      if (!authUser) {
        throw new ApiError(401, "Authentication required");
      }

      // 1. Find the current logged-in user's phone number (Destination)
      const user = await User.findById(authUser.id);
      if (!user || !user.mobile) {
        throw new ApiError(
          400,
          "Your mobile number is required to initiate a call",
        );
      }
      const toNumber = user.mobile;

      // extract callField and optional callType from request body
      const allowedFields = ["ESIC", "EPFO", "LOAN", "LWF"] as const;
      const callField = (req.body.callField as string) || null;
      const callType =
        typeof req.body.callType === "string" ? req.body.callType : undefined;
      if (!callField || !allowedFields.includes(callField as any)) {
        throw new ApiError(
          400,
          `callField is required and must be one of: ${allowedFields.join(", ")}`,
        );
      }

      // 2. Find the best agent (Admin with role 'call-person') using Round Robin
      // filter by agent that supports this callField
      const callPersonRole = await Role.findOne({ name: "call-person" });
      if (!callPersonRole) {
        throw new ApiError(
          500,
          "Support system is currently unavailable (Role not found)",
        );
      }

      const bestAgent = await Admin.findOne({
        role: callPersonRole._id,
        status: true,
        mobile: { $exists: true, $ne: "" },
        callFields: callField, // will match if array contains the field
      }).sort({ lastCallTakenAt: 1, callTakenCount: 1 });

      if (!bestAgent || !bestAgent.mobile) {
        throw new ApiError(
          404,
          "No support agents available at the moment. Please try again later.",
        );
      }
      //  const bestAgent = { mobile: "9218056160" };

      const fromNumber = bestAgent.mobile;

      // 3. Trigger Acefone Click-to-Call
      const response = await acefoneService.clickToCall(
        fromNumber,
        toNumber,
        callField,
      );

      // create initial call record (may be updated later via webhook)
      try {
        console.log("[AcefoneController] Click-to-call response:", JSON.stringify(response, null, 2));
        
        await AcefoneCall.create({
          uuid: response.uuid || undefined,
          call_to_number: toNumber,
          caller_id_number: fromNumber,
          start_stamp: new Date().toISOString(),
          billsec: "0",
          direction: "clicktocall",
          duration: "0",
          call_status: "initiated",
          call_id: response.call_id || response.id || undefined,
          ref_id: response.ref_id || response.request_id || "",
          callField,
          ...(callType ? { callType } : {}),
          userId: user._id,
          agentId: bestAgent._id,
        });
      } catch (err: any) {
        console.warn(
          "Could not create initial AcefoneCall record:",
          err?.message || err,
        );
      }

      // 4. Update Agent stats for Round Robin
      await Admin.findByIdAndUpdate(bestAgent._id, {
        $inc: { callTakenCount: 1 },
        $set: { lastCallTakenAt: new Date() },
      });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            response,
            "Connecting you to a support agent...",
          ),
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch call records from Acefone API
   */
  static async getCallRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        from_date,
        to_date,
        startDate,
        endDate,
        page,
        limit,
        call_type,
        agents,
        callerid,
      } = req.query;

      // Set default dates if not provided (7 days range)
      const endDateDefault = new Date();
      endDateDefault.setDate(endDateDefault.getDate() + 1);
      const startDateDefault = new Date(endDateDefault);
      startDateDefault.setDate(endDateDefault.getDate() - 7);

      const params = {
        from_date:
          from_date ||
          startDate ||
          startDateDefault.toISOString().split("T")[0],
        to_date:
          to_date || endDate || endDateDefault.toISOString().split("T")[0],
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        agents: agents || undefined,
        callerid: callerid || undefined,
        call_type: call_type || undefined,
      };

      const response = await acefoneService.getCallRecords(params);

      // Normalize records
      const records =
        response.results ||
        response.data ||
        (Array.isArray(response) ? response : []);

      if (records.length > 0) {
        // Fetch users to map mobile numbers to names
        const users = await User.find({}, "mobile fullName").lean();
        const nameMap: Record<string, string> = {};

        users.forEach((u: any) => {
          if (u.mobile) {
            const digits = String(u.mobile).replace(/\D/g, "");
            if (digits) {
              nameMap[digits] = u.fullName;
              if (digits.length >= 10) {
                // Map last 10 digits as well for better matching
                nameMap[digits.slice(-10)] = u.fullName;
              }
            }
          }
        });

        // Assign names back to records
        records.forEach((r: any) => {
          const clientNumber = r.client_number || r.client_id || "";
          const clientDigits = clientNumber
            ? String(clientNumber).replace(/\D/g, "")
            : "";

          let foundName = nameMap[clientDigits];
          if (!foundName && clientDigits.length >= 10) {
            foundName = nameMap[clientDigits.slice(-10)];
          }

          r.user_name = foundName || "Unknown User";
        });
      }

      // Acefone API often uses 'total_count' or 'count'
      const totalItems = Number(
        response.count ||
          response.total_count ||
          response.total ||
          (records.length < (params.limit || 10) ? records.length : 100),
      );
      const currentPage = Number(page) || 1;
      const itemsPerPage = Number(limit) || 10;
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            result: records,
            pagination: {
              totalItems,
              totalPages,
              currentPage,
              itemsPerPage,
            },
          },
          "Call records fetched from Acefone successfully",
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch call records from our database (internal MongoDB)
   * Supports pagination, filtering, and search
   */
  static async getAllCalls(req: Request, res: Response, next: NextFunction) {
    try {
      const lookupStages = [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $lookup: {
            from: "admins",
            localField: "agentId",
            foreignField: "_id",
            as: "agent",
          },
        },
        {
          $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
        },
        {
          $unwind: { path: "$agent", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            _id: 1,
            uuid: 1,
            call_id: 1,
            ref_id: 1,
            call_to_number: 1,
            caller_id_number: 1,
            customer_no_with_prefix: 1,
            direction: 1,
            call_status: 1,
            callField: 1,
            callType: 1,
            start_stamp: 1,
            answer_stamp: 1,
            end_stamp: 1,
            duration: 1,
            billsec: 1,
            agent_ring_time: 1,
            customer_ring_time: 1,
            answered_agent_name: 1,
            answered_agent_number: 1,
            hangup_cause_description: 1,
            hangup_cause_key: 1,
            campaign_name: 1,
            recording_url: 1,
            createdAt: 1,
            user: {
              _id: "$user._id",
              fullName: "$user.fullName",
              mobile: "$user.mobile",
              email: "$user.email",
            },
            agent: {
              _id: "$agent._id",
              name: "$agent.name",
              mobile: "$agent.mobile",
              email: "$agent.email",
            },
          },
        },
      ];

      // Use searchkey for the CommonService search functionality
      if (req.query.search && !req.query.searchkey) {
        req.query.searchkey = "call_to_number,caller_id_number,customer_no_with_prefix,answered_agent_number";
      }

      const result = await acefoneCallService.getAll(req.query, lookupStages);

      return res.status(200).json(
        new ApiResponse(
          200,
          result,
          "Internal call records fetched successfully",
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle webhook from Acefone for call events
   */
  static async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const payload: Partial<IAcefoneCall> = req.body;

      console.log(
        "[AcefoneWebhook] Payload received:",
        JSON.stringify(payload, null, 2),
      );

      // Validate required fields
      if (!payload.uuid || !payload.call_id || !payload.ref_id) {
        throw new ApiError(
          400,
          "Invalid webhook payload: missing required fields",
        );
      }

      // Find user by phone number (caller_id_number or customer_no_with_prefix)
      let userId = null;
      const phoneNumber =
        payload.caller_id_number || payload.customer_no_with_prefix;
      if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\D/g, "");
        const user = await User.findOne({
          $or: [{ mobile: cleanPhone }, { mobile: cleanPhone.slice(-10) }],
        });
        if (user) {
          userId = user._id;
        }
      }

      // Find agent by phone number (answered_agent_number)
      let agentId = null;
      if (payload.answered_agent_number) {
        const cleanAgentPhone = payload.answered_agent_number.replace(
          /\D/g,
          "",
        );
        const agent = await Admin.findOne({
          $or: [
            { mobile: cleanAgentPhone },
            { mobile: cleanAgentPhone.slice(-10) },
          ],
        });
        if (agent) {
          agentId = agent._id;
        }
      }

      // Create or update the call record
      // we only include userId and agentId if found to avoid overwriting existing values with null
      const callData: any = {
        ...payload,
      };
      
      if (userId) callData.userId = userId;
      if (agentId) callData.agentId = agentId;

      if (!Object.prototype.hasOwnProperty.call(payload, "callField")) {
        delete callData.callField;
      }

      // Search by uuid or ref_id to link with the initiated record
      const call = await AcefoneCall.findOneAndUpdate(
        {
          $or: [
            { uuid: payload.uuid },
            { ref_id: payload.ref_id }
          ]
        },
        callData,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      console.log("[AcefoneWebhook] Call record saved/updated:", call._id);

      // If call was answered, update agent stats for round robin
      if (payload.call_status === "answered" && agentId) {
        await Admin.findByIdAndUpdate(agentId, {
          $inc: { callTakenCount: 1 },
          lastCallTakenAt: new Date(),
        });
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { callId: call._id },
            "Webhook processed successfully",
          ),
        );
    } catch (error) {
      console.error("[AcefoneWebhook] Error processing webhook:", error);
      next(error);
    }
  }

  /**
   * Get aggregated call stats for the call dashboard
   * Supports optional date range, agentId, callField filters
   */
  static async getCallStats(req: Request, res: Response, next: NextFunction) {
    try {
      const match: any = {};
      const { startDate, endDate, agentId, callField } = req.query as any;

      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
        if (endDate) match.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
      }
      if (agentId) match.agentId = agentId;
      if (callField) match.callField = callField;

      const [overview, dailyTrend, agentStats, callFieldStats] = await Promise.all([
        // Overview totals
        AcefoneCall.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              totalCalls: { $sum: 1 },
              answered: { $sum: { $cond: [{ $eq: ["$call_status", "answered"] }, 1, 0] } },
              missed: { $sum: { $cond: [{ $in: ["$call_status", ["missed", "no-answer"]] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $not: { $in: ["$call_status", ["answered", "missed", "no-answer"]] } }, 1, 0] } },
              totalDuration: { $sum: { $toDouble: "$duration" } },
              avgDuration: { $avg: { $toDouble: "$duration" } },
            },
          },
        ]),

        // Daily trend
        AcefoneCall.aggregate([
          { $match: match },
          {
            $group: {
              _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } },
              total: { $sum: 1 },
              answered: { $sum: { $cond: [{ $eq: ["$call_status", "answered"] }, 1, 0] } },
              missed: { $sum: { $cond: [{ $in: ["$call_status", ["missed", "no-answer"]] }, 1, 0] } },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
          {
            $project: {
              _id: 0,
              date: { $dateToString: { format: "%Y-%m-%d", date: { $dateFromParts: { year: "$_id.year", month: "$_id.month", day: "$_id.day" } } } },
              total: 1, answered: 1, missed: 1,
            },
          },
        ]),

        // Agent performance
        AcefoneCall.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$agentId",
              total: { $sum: 1 },
              answered: { $sum: { $cond: [{ $eq: ["$call_status", "answered"] }, 1, 0] } },
              missed: { $sum: { $cond: [{ $in: ["$call_status", ["missed", "no-answer"]] }, 1, 0] } },
              duration: { $sum: { $toDouble: "$duration" } },
            },
          },
          { $lookup: { from: "admins", localField: "_id", foreignField: "_id", as: "agent" } },
          { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0, agentId: "$_id",
              name: { $ifNull: ["$agent.name", "Unknown Agent"] },
              mobile: "$agent.mobile",
              total: 1, answered: 1, missed: 1, duration: 1,
            },
          },
          { $sort: { total: -1 } },
          { $limit: 20 },
        ]),

        // CallField breakdown
        AcefoneCall.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$callField",
              total: { $sum: 1 },
              answered: { $sum: { $cond: [{ $eq: ["$call_status", "answered"] }, 1, 0] } },
            },
          },
          { $project: { _id: 0, callField: { $ifNull: ["$_id", "Unknown"] }, total: 1, answered: 1 } },
          { $sort: { total: -1 } },
        ]),
      ]);

      const o = overview[0] || {};
      return res.status(200).json(
        new ApiResponse(200, {
          totalCalls: o.totalCalls || 0,
          answered: o.answered || 0,
          missed: o.missed || 0,
          failed: o.failed || 0,
          totalDuration: Math.round(o.totalDuration || 0),
          avgDuration: Math.round(o.avgDuration || 0),
          dailyTrend,
          byAgent: agentStats,
          byCallField: callFieldStats,
        }, "Call stats fetched successfully"),
      );
    } catch (error) {
      next(error);
    }
  }
}
