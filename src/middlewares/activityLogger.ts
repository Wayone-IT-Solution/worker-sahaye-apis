import ActivityLog from "../modals/activitylog.model";
import { Request, Response, NextFunction } from "express";

// Utility to safely stringify large objects or remove sensitive fields
const sanitize = (data: any) => {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return null;
  }
};

const capitalize = (text: string): string =>
  text && text.charAt(0).toUpperCase() + text.slice(1);

export const activityLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;
  if ((req as any).user?.role === "admin" || !(req as any).user?.role)
    return next();

  res.send = function (body) {
    const log = new ActivityLog({
      userId: (req as any).user?._id || null,
      role: (req as any).user?.role
        ? capitalize((req as any).user?.role)
        : null,
      requestBody: sanitize(req.body),
      queryParams: sanitize(req.query),
      pathParams: sanitize(req.params),
      responseBody: sanitize(tryParse(body)),
      action: `${req.method} ${req.originalUrl}`,
      description: `${req.method} ${req.originalUrl} - ${res.statusCode}`,
    });

    log.save().catch((err: any) => {
      console.log("Failed to log activity:", err);
    });
    return originalSend.call(this, body);
  };

  next();
};

// Try parse JSON string safely
function tryParse(body: any) {
  try {
    if (typeof body === "string") return JSON.parse(body);
    return body;
  } catch {
    return body;
  }
}
