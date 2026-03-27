import ApiError from "../../utils/ApiError";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { Course } from "../../modals/courses.model";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { PlanType } from "../../modals/subscriptionplan.model";
import { CommonService } from "../../services/common.services";
import {
  getRecentReviews,
  getReviewStats,
} from "../../public/coursereview/coursereview.controller";
import {
  sanitizePayloadObject,
  normalizePayloadToArray,
} from "../../utils/payloadSanitizer";

const courseService = new CommonService(Course);
const ENROLLMENT_LOCK_HOURS = 12;

const normalizeCourseType = (rawType: any): string => {
  const values = (Array.isArray(rawType) ? rawType : [rawType]).flatMap(
    (value) =>
      String(value || "")
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
  );

  const allowedTypes = new Set(["online", "offline"]);
  const filteredValues = values.filter((entry) => allowedTypes.has(entry));
  const uniqueValues = Array.from(new Set(filteredValues));
  return uniqueValues.length ? uniqueValues.join(",") : "online";
};

const normalizeBooleanValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return false;

  if (["active", "true", "1", "yes"].includes(normalized)) return true;
  if (["inactive", "false", "0", "no"].includes(normalized)) return false;
  return false;
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }

  if (typeof value === "string") {
    const normalized = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }

  return undefined;
};

const normalizeNumericValue = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return undefined;
  return numericValue;
};

const normalizeDateValue = (value: unknown): Date | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const normalizeTimeString = (value: unknown): string | undefined => {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
};

const parseTimeToMinutes = (rawTime?: string): number | null => {
  if (!rawTime) return null;
  const normalized = String(rawTime).trim();
  if (!normalized) return null;

  const twentyFourHourMatch = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);
    return hours * 60 + minutes;
  }

  const twelveHourMatch = normalized.match(
    /^(0?\d|1[0-2]):([0-5]\d)\s*([aApP][mM])$/,
  );
  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]) % 12;
    const minutes = Number(twelveHourMatch[2]);
    const meridian = twelveHourMatch[3].toUpperCase();
    if (meridian === "PM") hours += 12;
    return hours * 60 + minutes;
  }

  return null;
};

const buildSessionStartDate = (session: any): Date | null => {
  const date = normalizeDateValue(session?.date);
  if (!date) return null;

  const withTime = new Date(date);
  const minutes = parseTimeToMinutes(normalizeTimeString(session?.startTime));
  if (minutes !== null) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    withTime.setHours(hours, mins, 0, 0);
  } else {
    withTime.setHours(0, 0, 0, 0);
  }
  return withTime;
};

const parseClassScheduleRaw = (rawSchedule: unknown): any[] | undefined => {
  if (rawSchedule === undefined || rawSchedule === null || rawSchedule === "") {
    return undefined;
  }

  if (Array.isArray(rawSchedule)) {
    if (
      rawSchedule.length === 1 &&
      typeof rawSchedule[0] === "string" &&
      String(rawSchedule[0]).trim().startsWith("[")
    ) {
      try {
        const parsed = JSON.parse(String(rawSchedule[0]));
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        throw new ApiError(400, "classSchedule JSON format is invalid");
      }
    }
    return rawSchedule;
  }

  if (typeof rawSchedule === "string") {
    const trimmed = rawSchedule.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        throw new ApiError(400, "classSchedule JSON format is invalid");
      }
    }

    throw new ApiError(
      400,
      'classSchedule must be a valid JSON array string (example: [{"date":"2026-04-10","hours":2,"mode":"online","meetingLink":"https://..."}])',
    );
  }

  if (typeof rawSchedule === "object") {
    return [rawSchedule];
  }

  return undefined;
};

const normalizeClassSchedule = (
  rawSchedule: unknown,
  normalizedCourseType: string,
): Array<Record<string, any>> | undefined => {
  const parsedSchedule = parseClassScheduleRaw(rawSchedule);
  if (!parsedSchedule) return undefined;
  if (!parsedSchedule.length) return [];

  const defaultMode = normalizedCourseType.includes("offline")
    ? "offline"
    : "online";

  return parsedSchedule.map((session, index) => {
    const rowNumber = index + 1;
    let source = session as any;
    if (typeof session === "string") {
      try {
        source = JSON.parse(String(session));
      } catch {
        throw new ApiError(
          400,
          `classSchedule row ${rowNumber} must be valid JSON`,
        );
      }
    }
    if (!source || typeof source !== "object") {
      throw new ApiError(
        400,
        `classSchedule row ${rowNumber} must be an object`,
      );
    }

    const date = normalizeDateValue(
      (source as any).date ??
        (source as any).classDate ??
        (source as any).sessionDate,
    );
    if (!date) {
      throw new ApiError(
        400,
        `classSchedule row ${rowNumber} has invalid date`,
      );
    }

    const hours = normalizeNumericValue(
      (source as any).hours ??
        (source as any).durationHours ??
        (source as any).duration,
    );
    if (hours === undefined || hours <= 0) {
      throw new ApiError(
        400,
        `classSchedule row ${rowNumber} requires hours greater than 0`,
      );
    }

    const modeRaw = String(
      (source as any).mode ?? (source as any).type ?? defaultMode,
    )
      .trim()
      .toLowerCase();
    const mode = modeRaw === "offline" ? "offline" : "online";

    const meetingLink = normalizeTimeString(
      (source as any).meetingLink ??
        (source as any).onlineLink ??
        (source as any).link,
    );
    const locationName = normalizeTimeString(
      (source as any).locationName ?? (source as any).location,
    );
    const locationAddress = normalizeTimeString(
      (source as any).locationAddress ?? (source as any).address,
    );

    if (mode === "online" && !meetingLink) {
      throw new ApiError(
        400,
        `classSchedule row ${rowNumber} requires meetingLink for online mode`,
      );
    }

    if (mode === "offline" && !locationName && !locationAddress) {
      throw new ApiError(
        400,
        `classSchedule row ${rowNumber} requires locationName or locationAddress for offline mode`,
      );
    }

    const maxStudents = normalizeNumericValue(
      (source as any).maxStudents ??
        (source as any).capacity ??
        (source as any).maxSeats,
    );
    if (maxStudents !== undefined && maxStudents < 1) {
      throw new ApiError(
        400,
        `classSchedule row ${rowNumber} maxStudents must be at least 1`,
      );
    }

    return {
      date,
      mode,
      hours,
      maxStudents,
      meetingLink,
      locationName,
      locationAddress,
      note: normalizeTimeString((source as any).note ?? (source as any).remark),
      startTime: normalizeTimeString((source as any).startTime),
      endTime: normalizeTimeString((source as any).endTime),
      isActive:
        (source as any).isActive === undefined
          ? true
          : normalizeBooleanValue((source as any).isActive),
    };
  });
};

const getFirstClassStartDate = (courseData: any): Date | undefined => {
  const schedule = Array.isArray(courseData?.classSchedule)
    ? courseData.classSchedule
    : [];
  const scheduleStarts = schedule
    .filter((session: any) => session && session.isActive !== false)
    .map((session: any) => buildSessionStartDate(session))
    .filter((date: Date | null): date is Date => Boolean(date));

  if (scheduleStarts.length > 0) {
    return new Date(
      Math.min(
        ...scheduleStarts.map((sessionStart: Date) => sessionStart.getTime()),
      ),
    );
  }

  const startDate = normalizeDateValue(courseData?.startDate);
  if (!startDate) return undefined;
  return startDate;
};

const getEnrollmentLockDate = (courseData: any): Date | undefined => {
  const firstClassStart = getFirstClassStartDate(courseData);
  if (!firstClassStart) return undefined;
  return new Date(
    firstClassStart.getTime() - ENROLLMENT_LOCK_HOURS * 60 * 60 * 1000,
  );
};

const getEnrollmentWindowMeta = (courseData: any) => {
  const firstClassStart = getFirstClassStartDate(courseData);
  const enrollmentLockAt = getEnrollmentLockDate(courseData);
  const now = new Date();

  return {
    firstClassStartAt: firstClassStart,
    enrollmentLockAt,
    enrollmentLocked: enrollmentLockAt
      ? now.getTime() >= enrollmentLockAt.getTime()
      : false,
  };
};

const hasSchedulingFields = (payload: Record<string, any>) => {
  const schedulingKeys = new Set([
    "type",
    "address",
    "endDate",
    "startDate",
    "classSchedule",
    "classSessions",
    "schedule",
    "locationName",
    "locationAddress",
    "contactEmail",
    "contactPhone",
  ]);

  return Object.keys(payload || {}).some((key) => schedulingKeys.has(key));
};

const extractImageUrl = (input: unknown): string | undefined => {
  if (Array.isArray(input) && input.length > 0) {
    const uploadedUrl = String((input[0] as any)?.url ?? "").trim();
    return uploadedUrl || undefined;
  }

  if (typeof input === "string") {
    const normalized = input.trim();
    return normalized || undefined;
  }

  return undefined;
};

const normalizeCoursePayload = (payload: Record<string, any>) => {
  const normalizedPayload = { ...payload };
  const normalizedTags = normalizeStringArray(normalizedPayload.tags);
  const normalizedExtras = normalizeStringArray(normalizedPayload.extras);
  const normalizedStartDate = normalizeDateValue(normalizedPayload.startDate);
  const normalizedEndDate = normalizeDateValue(normalizedPayload.endDate);
  const normalizedAmount = normalizeNumericValue(normalizedPayload.amount);
  const normalizedType = normalizeCourseType(normalizedPayload.type);
  const normalizedDiscountedAmount = normalizeNumericValue(
    normalizedPayload.discountedAmount,
  );
  const rawScheduleInput =
    normalizedPayload.classSchedule ??
    normalizedPayload.classSessions ??
    normalizedPayload.schedule;
  const hasScheduleInput = rawScheduleInput !== undefined;
  const normalizedSchedule = normalizeClassSchedule(
    rawScheduleInput,
    normalizedType,
  );

  normalizedPayload.isFree = normalizeBooleanValue(normalizedPayload.isFree);
  normalizedPayload.type = normalizedType;

  if (normalizedTags) normalizedPayload.tags = normalizedTags;
  if (normalizedExtras) normalizedPayload.extras = normalizedExtras;

  if (normalizedAmount !== undefined)
    normalizedPayload.amount = normalizedAmount;
  if (normalizedDiscountedAmount !== undefined) {
    normalizedPayload.discountedAmount = normalizedDiscountedAmount;
  } else if (normalizedAmount !== undefined) {
    normalizedPayload.discountedAmount = normalizedAmount;
  }

  if (hasScheduleInput) {
    normalizedPayload.classSchedule = normalizedSchedule ?? [];
  }
  delete normalizedPayload.classSessions;
  delete normalizedPayload.schedule;

  if (
    Array.isArray(normalizedPayload.classSchedule) &&
    normalizedPayload.classSchedule.length
  ) {
    const scheduleDates = normalizedPayload.classSchedule
      .map((session: any) => normalizeDateValue(session?.date))
      .filter((date: Date | undefined): date is Date => Boolean(date));
    if (scheduleDates.length > 0) {
      const start = new Date(
        Math.min(...scheduleDates.map((date) => date.getTime())),
      );
      const end = new Date(
        Math.max(...scheduleDates.map((date) => date.getTime())),
      );
      normalizedPayload.startDate = start;
      normalizedPayload.endDate = end;
    }
  } else {
    if (normalizedStartDate) normalizedPayload.startDate = normalizedStartDate;
    if (normalizedEndDate) normalizedPayload.endDate = normalizedEndDate;
  }

  if (normalizedPayload.startDate && normalizedPayload.endDate) {
    const startTime = new Date(normalizedPayload.startDate).getTime();
    const endTime = new Date(normalizedPayload.endDate).getTime();
    if (startTime > endTime) {
      throw new ApiError(400, "endDate must be after startDate");
    }
  }

  const normalizedImageUrl = extractImageUrl(normalizedPayload.imageUrl);
  if (normalizedImageUrl) {
    normalizedPayload.imageUrl = normalizedImageUrl;
  } else {
    delete normalizedPayload.imageUrl;
  }

  return normalizedPayload;
};

// Helper function to get course access and pricing benefits based on subscription plan
const getCourseAccessBenefits = async (userId: string | null) => {
  // Default benefits for FREE plan (no subscription)
  const defaultBenefits = {
    planType: PlanType.FREE,
    canViewTrainingPrograms: true,
    trainingFeeDiscount: 0,
    canGetSkillCertification: false,
    canGetSkillBadge: false,
  };

  if (!userId) {
    return defaultBenefits;
  }

  // Get user's active subscription plan
  const enrolledPlan = await EnrolledPlan.findOne({
    user: userId,
    status: "active",
  }).populate("plan");

  // If no active plan, return FREE plan benefits
  if (!enrolledPlan || !enrolledPlan.plan) {
    return defaultBenefits;
  }

  const planType = (enrolledPlan.plan as any).planType;

  // Define course benefits based on plan type
  const benefitsMap: Record<
    string,
    {
      planType: string;
      canViewTrainingPrograms: boolean;
      trainingFeeDiscount: number;
      canGetSkillCertification: boolean;
      canGetSkillBadge: boolean;
    }
  > = {
    [PlanType.FREE]: {
      planType: PlanType.FREE,
      canViewTrainingPrograms: true,
      trainingFeeDiscount: 0,
      canGetSkillCertification: false,
      canGetSkillBadge: false,
    },
    [PlanType.BASIC]: {
      planType: PlanType.BASIC,
      canViewTrainingPrograms: true,
      trainingFeeDiscount: 10,
      canGetSkillCertification: true,
      canGetSkillBadge: false,
    },
    [PlanType.PREMIUM]: {
      planType: PlanType.PREMIUM,
      canViewTrainingPrograms: true,
      trainingFeeDiscount: 30,
      canGetSkillCertification: true,
      canGetSkillBadge: true,
    },
  };

  return benefitsMap[planType] ?? defaultBenefits;
};

export class CourseController {
  static async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const sanitizedBody = sanitizePayloadObject(req.body);
      const data = normalizeCoursePayload(sanitizedBody);

      const result = await courseService.create(data);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create course"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async createCourseBulk(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const incomingRows = normalizePayloadToArray(req.body);
      if (!incomingRows.length) {
        return res
          .status(400)
          .json(new ApiError(400, "Bulk payload cannot be empty"));
      }

      const payloadForInsert: Record<string, any>[] = [];
      for (let index = 0; index < incomingRows.length; index += 1) {
        const rowNumber = index + 1;
        const normalizedRow = normalizeCoursePayload(incomingRows[index]);
        const name = String(normalizedRow?.name ?? "").trim();
        const amount = normalizeNumericValue(normalizedRow?.amount);
        const discountedAmount = normalizeNumericValue(
          normalizedRow?.discountedAmount,
        );

        if (!name) {
          return res
            .status(400)
            .json(new ApiError(400, `Row ${rowNumber}: "name" is required`));
        }
        if (amount === undefined) {
          return res
            .status(400)
            .json(new ApiError(400, `Row ${rowNumber}: "amount" is required`));
        }
        if (amount < 0) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `Row ${rowNumber}: "amount" must be 0 or greater`,
              ),
            );
        }

        if (discountedAmount !== undefined && discountedAmount < 0) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `Row ${rowNumber}: "discountedAmount" must be 0 or greater`,
              ),
            );
        }

        payloadForInsert.push({
          ...normalizedRow,
          name,
          amount,
          discountedAmount: discountedAmount ?? amount,
        });
      }

      const result = await Course.insertMany(payloadForInsert);
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            `${result.length} course(s) created successfully`,
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || null;
      const benefits = await getCourseAccessBenefits(userId);
      const categoryWise = String(req.query.categoryWise) === "true";

      // Fetch user's worker category if authenticated
      let userWorkerCategoryId = null;
      if (userId && categoryWise) {
        const user = await User.findById(userId).select("workerCategory");
        userWorkerCategoryId = user?.workerCategory;
      }

      const pipeline: any[] = [
        {
          $lookup: {
            from: "coursereviews",
            localField: "_id",
            foreignField: "courseId",
            as: "reviews",
          },
        },
        {
          $addFields: {
            averageRating: {
              $cond: [
                { $gt: [{ $size: "$reviews" }, 0] },
                { $avg: "$reviews.rating" },
                0,
              ],
            },
            totalReviews: { $size: "$reviews" },
          },
        },
        { $project: { reviews: 0 } },
      ];

      // Add category filter only if categoryWise=true and user has a worker category
      if (userWorkerCategoryId) {
        pipeline.push({
          $match: {
            category: userWorkerCategoryId,
          },
        });
      }

      // Remove categoryWise from query to avoid interference with service logic
      const queryParams = { ...req.query };
      delete queryParams.categoryWise;
      if (typeof queryParams.type === "string" && queryParams.type.trim()) {
        const normalizedType = queryParams.type.trim().toLowerCase();
        if (["online", "offline"].includes(normalizedType)) {
          queryParams.type__regex = `(^|,\\s*)${normalizedType}(\\s*,|$)`;
          delete queryParams.type;
        }
      }

      let result: any = await courseService.getAll(queryParams, pipeline);

      // Add personalized pricing for each course
      if (Array.isArray(result)) {
        result = result.map((course: any) => {
          let yourPrice = course.amount;
          let discountAmount = 0;
          const enrollmentWindow = getEnrollmentWindowMeta(course);

          // Calculate discount for paid courses
          if (!course.isFree && benefits.trainingFeeDiscount > 0) {
            discountAmount = Math.round(
              (course.amount * benefits.trainingFeeDiscount) / 100,
            );
            yourPrice = course.amount - discountAmount;
          }

          return {
            ...course,
            originalPrice: course.amount,
            yourPrice,
            discountPercentage: benefits.trainingFeeDiscount,
            discountAmount,
            ...enrollmentWindow,
            userPlanType: benefits.planType,
          };
        });
      } else if (result && result.result) {
        result.result = result.result.map((course: any) => {
          let yourPrice = course.amount;
          let discountAmount = 0;
          const enrollmentWindow = getEnrollmentWindowMeta(course);

          // Calculate discount for paid courses
          if (!course.isFree && benefits.trainingFeeDiscount > 0) {
            discountAmount = Math.round(
              (course.amount * benefits.trainingFeeDiscount) / 100,
            );
            yourPrice = course.amount - discountAmount;
          }

          return {
            ...course,
            originalPrice: course.amount,
            yourPrice,
            discountPercentage: benefits.trainingFeeDiscount,
            discountAmount,
            ...enrollmentWindow,
            userPlanType: benefits.planType,
          };
        });
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getCourseById(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = (req as any).user;
      const userId = (req as any).user?.id || null;
      let result = await courseService.getById(req.params.id, role !== "admin");
      if (!result)
        return res.status(404).json(new ApiError(404, "course not found"));

      const reviewsData = await getReviewStats(req.params.id.toString());
      const recentReviews = await getRecentReviews(req.params.id.toString(), 3);
      result = JSON.parse(JSON.stringify(result));

      // Get user's subscription benefits for personalized pricing
      const benefits = await getCourseAccessBenefits(userId);

      // Calculate personalized price
      let yourPrice = result.amount;
      let discountAmount = 0;

      if (!result.isFree && benefits.trainingFeeDiscount > 0) {
        discountAmount = Math.round(
          (result.amount * benefits.trainingFeeDiscount) / 100,
        );
        yourPrice = result.amount - discountAmount;
      }

      const data = {
        ...result,
        ...reviewsData,
        recentReviews,
        ...getEnrollmentWindowMeta(result),
        originalPrice: result.amount,
        yourPrice,
        discountPercentage: benefits.trainingFeeDiscount,
        discountAmount,
        userPlanType: benefits.planType,
      };

      return res
        .status(200)
        .json(new ApiResponse(200, data, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateCourseById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const extractImageUrl = async (input: any, existing: string) => {
        if (!input || (Array.isArray(input) && input.length === 0))
          return existing || "";
        if (Array.isArray(input) && input.length > 0) {
          const newUrl = input[0]?.url;
          if (existing && existing !== newUrl) {
            const s3Key = existing.split(".com/")[1];
            await deleteFromS3(s3Key);
          }
          return newUrl || "";
        }
        if (typeof input === "string") return input;
        return existing || "";
      };

      const existingCourse: any = await courseService.getById(req.params.id);
      if (!existingCourse)
        return res.status(404).json(new ApiError(404, "Course not found"));

      const bodyPayload = sanitizePayloadObject(req.body);
      const scheduleLockedAt = getEnrollmentLockDate(existingCourse);
      if (
        scheduleLockedAt &&
        hasSchedulingFields(bodyPayload) &&
        Date.now() >= scheduleLockedAt.getTime()
      ) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Course schedule is locked. Scheduling changes are allowed only until ${ENROLLMENT_LOCK_HOURS} hours before first class start.`,
            ),
          );
      }

      const normalizedData = normalizeCoursePayload(bodyPayload);
      normalizedData.imageUrl = await extractImageUrl(
        req.body.imageUrl,
        existingCourse?.imageUrl,
      );
      const result = await courseService.updateById(
        req.params.id,
        normalizedData,
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update course"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteCourseById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await courseService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete course"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getTrainingBenefits(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = (req as any).user?.id || null;
      const benefits = await getCourseAccessBenefits(userId);

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            benefits,
            "Training and Certification benefits fetched successfully",
          ),
        );
    } catch (err) {
      next(err);
    }
  }
}
