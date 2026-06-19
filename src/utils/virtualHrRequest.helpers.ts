import Admin from "../modals/admin.model";
import { UserType as NotificationUserType } from "../modals/notification.model";
import { sendSingleNotification } from "../services/notification.service";

type UserLike = {
  _id?: any;
  userType?: string;
  fullName?: string;
  mobile?: string;
  email?: string;
  primaryLocation?: Record<string, any>;
  profile?: {
    company?: Record<string, any>;
    business?: Record<string, any>;
  };
};

const isPlainRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date);

const setNestedValue = (target: Record<string, any>, path: string, value: any) => {
  const keys = path.split(".");
  let cursor = target;

  keys.slice(0, -1).forEach((key) => {
    if (!isPlainRecord(cursor[key])) cursor[key] = {};
    cursor = cursor[key];
  });

  cursor[keys[keys.length - 1]] = value;
};

export const normalizeDottedPayload = (payload: Record<string, any> = {}) => {
  const normalized: Record<string, any> = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (key.includes(".")) setNestedValue(normalized, key, value);
    else normalized[key] = value;
  });

  return normalized;
};

const compactLocation = (location?: Record<string, any>) => {
  if (!location) return "";

  return [
    location.address,
    location.city,
    location.state,
    location.country,
    location.pincode,
  ]
    .filter(Boolean)
    .join(", ");
};

export const applyRequesterProfileDefaults = (
  payload: Record<string, any>,
  user?: UserLike | null,
) => {
  if (!user) return payload;

  const company = user.profile?.company;
  const business = user.profile?.business;
  const companyLocation = Array.isArray(company?.locations)
    ? company?.locations?.[0]
    : undefined;
  const businessLocation = Array.isArray(business?.operationalArea)
    ? business?.operationalArea?.[0]
    : undefined;
  const location =
    compactLocation(companyLocation) ||
    compactLocation(businessLocation) ||
    compactLocation(user.primaryLocation);

  return {
    ...payload,
    companyName:
      String(payload.companyName ?? "").trim() ||
      company?.name ||
      business?.name ||
      user.fullName,
    contactPerson:
      String(payload.contactPerson ?? "").trim() || user.fullName,
    mobileNumber:
      String(payload.mobileNumber ?? payload.mobile ?? "").trim() || user.mobile,
    mobile:
      String(payload.mobile ?? payload.mobileNumber ?? "").trim() || user.mobile,
    email: String(payload.email ?? "").trim() || user.email,
    location: String(payload.location ?? "").trim() || location,
  };
};

const toComparableDate = (value: unknown) => {
  if (!value) return null;

  let date: Date;
  if (value instanceof Date) date = new Date(value);
  else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(String(value));
  }

  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

export const validateVirtualHrDates = (payload: Record<string, any>) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expectedStartDate = toComparableDate(payload.expectedStartDate);
  const durationFrom = toComparableDate(payload.duration?.from);
  const durationTo = toComparableDate(payload.duration?.to);

  if (expectedStartDate && expectedStartDate < today) {
    return "Expected start date cannot be in the past.";
  }

  if (durationFrom && durationFrom < today) {
    return "Engagement start date cannot be in the past.";
  }

  if (durationTo && durationTo < today) {
    return "Engagement end date cannot be in the past.";
  }

  if (durationFrom && durationTo && durationTo < durationFrom) {
    return "Engagement end date cannot be earlier than the start date.";
  }

  return null;
};

export const sendServiceRequestCreatedNotifications = async ({
  userId,
  userRole,
  user,
  request,
  serviceName,
}: {
  userId: string;
  userRole: string;
  user?: UserLike | null;
  request: Record<string, any>;
  serviceName: string;
}) => {
  const role = String(user?.userType || userRole).toLowerCase() as NotificationUserType;
  const requesterName = user?.fullName || request.contactPerson || "User";
  const context = {
    serviceName,
    requesterName,
    companyName: request.companyName || "the company",
    requestId: String(request._id || ""),
  };

  const sendJobs: Promise<any>[] = [
    sendSingleNotification({
      type: "service-request-created",
      context,
      toRole: role,
      toUserId: userId,
      fromUser: { id: userId, role },
    }),
  ];

  const admins = await Admin.find({ status: true }).select("_id").lean();
  admins.forEach((adminUser: any) => {
    sendJobs.push(
      sendSingleNotification({
        type: "service-request-created",
        direction: "sender",
        context,
        toRole: NotificationUserType.ADMIN,
        toUserId: String(adminUser._id),
        fromUser: { id: userId, role },
      }),
    );
  });

  const results = await Promise.allSettled(sendJobs);
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.log(`[Notification] Service request creation notice failed: ${result.reason?.message || result.reason}`);
    }
  });
};
