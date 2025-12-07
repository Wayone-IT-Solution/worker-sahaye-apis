import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { servetelService } from "../../services/servetel.service";

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

export class ServetelController {
  private static parseListParams(req: Request) {
    return {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      startDate:
        (req.query.startDate as string) || (req.query.from as string) || undefined,
      endDate:
        (req.query.endDate as string) || (req.query.to as string) || undefined,
      search: (req.query.search as string) || undefined,
      searchKey:
        (req.query.searchkey as string) ||
        (req.query.searchKey as string) ||
        undefined,
      sortKey: (req.query.sortKey as string) || undefined,
      sortDir: (req.query.sortDir as string) || undefined,
    };
  }

  private static normalizeRecording(item: any) {
    return {
      id:
        item.id ||
        item._id ||
        item.call_id ||
        item.uuid ||
        item.unique_id,
      from:
        item.from ||
        item.source ||
        item.caller_id ||
        item.caller ||
        item.customer_number,
      to:
        item.to ||
        item.destination ||
        item.agent_number ||
        item.receiver ||
        item.forwarded_to,
      direction: item.direction || item.call_type || item.type,
      status: item.status || item.call_status || item.state,
      startedAt:
        item.startedAt ||
        item.started_at ||
        item.start_time ||
        item.call_start_time ||
        item.createdAt,
      endedAt:
        item.endedAt ||
        item.ended_at ||
        item.end_time ||
        item.call_end_time ||
        item.completedAt,
      durationSeconds:
        item.duration ||
        item.talk_time ||
        item.call_duration ||
        item.total_duration ||
        0,
      recordingUrl:
        item.recordingUrl ||
        item.recording_url ||
        item.recording ||
        item.recording_link ||
        "",
      hangupCause:
        item.hangup_cause ||
        item.hangupReason ||
        item.disconnection_reason ||
        "",
    };
  }

  private static normalizeForwardingRule(item: any) {
    return {
      id: item.id || item._id || item.rule_id || item.uuid,
      name: item.name || item.flow_name || item.title || item.rule_name,
      sourceNumber:
        item.source ||
        item.entry_point ||
        item.caller_id ||
        item.caller_number,
      destinationNumber:
        item.destination ||
        item.forward_to ||
        item.forwarding_to ||
        item.agent_number,
      type: item.type || item.flow_type || item.routing_type,
      status: item.status || item.state || item.is_active,
      updatedAt:
        item.updatedAt ||
        item.updated_at ||
        item.modifiedAt ||
        item.last_updated,
    };
  }

  static async initiateCall(req: Request, res: Response, next: NextFunction) {
    try {
      const { to, from, callerId, customParams } = req.body;

      if (!to || !from) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Both 'to' (customer) and 'from' (agent) numbers are required"
            )
          );
      }
      const response = await servetelService.clickToCall({
        to,
        from,
        callerId,
        customParams,
      });

      return res
        .status(200)
        .json(
          new ApiResponse(200, response, "Servetel call triggered successfully")
        );
    } catch (err) {
      next(
        err instanceof ApiError
          ? err
          : new ApiError(500, "Failed to trigger Servetel call")
      );
    }
  }

  static async getCallStats(req: Request, res: Response, next: NextFunction) {
    try {
      const toDateIso = parseDate((req.query.to as string) || null);
      const fromDateIso = parseDate((req.query.from as string) || null);

      const now = new Date();
      const fallbackTo = toDateIso || now.toISOString();
      const fallbackFrom = (() => {
        const d = new Date(toDateIso || now);
        d.setDate(d.getDate() - 7);
        return fromDateIso || d.toISOString();
      })();

      const response = await servetelService.getCallStats({
        toDate: fallbackTo,
        fromDate: fallbackFrom,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            response,
            "Servetel call stats fetched successfully"
          )
        );
    } catch (err) {
      next(
        err instanceof ApiError
          ? err
          : new ApiError(500, "Failed to fetch Servetel stats")
      );
    }
  }

  static async getCallRecordings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params = this.parseListParams(req);
      const response = await servetelService.getCallRecordings(params);
      const normalized = (response?.result || []).map((item: any) =>
        this.normalizeRecording(item)
      );

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { ...response, result: normalized },
            "Servetel call recordings fetched successfully"
          )
        );
    } catch (err) {
      next(
        err instanceof ApiError
          ? err
          : new ApiError(500, "Failed to fetch Servetel call recordings")
      );
    }
  }

  static async getCallForwardingRules(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params = this.parseListParams(req);
      const response = await servetelService.getCallForwardingRules(params);
      const normalized = (response?.result || []).map((item: any) =>
        this.normalizeForwardingRule(item)
      );

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { ...response, result: normalized },
            "Servetel call forwarding flows fetched successfully"
          )
        );
    } catch (err) {
      next(
        err instanceof ApiError
          ? err
          : new ApiError(500, "Failed to fetch Servetel forwarding flows")
      );
    }
  }
}
