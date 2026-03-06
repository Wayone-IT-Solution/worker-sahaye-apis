import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import {
  Enrollment,
  PaymentStatus,
  PaymentGateway,
  EnrollmentStatus,
} from "../../modals/enrollment.model";
import { Course } from "../../modals/courses.model";
import { User } from "../../modals/user.model";
import { CommonService } from "../../services/common.services";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { PlanType } from "../../modals/subscriptionplan.model";
import { redeemUserPoints, refundUserPoints, normalizePoints } from "../../utils/points";

const enrollmentService = new CommonService(Enrollment);
const ENROLLMENT_LOCK_HOURS = 12;

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

  // Get user's highest priority active subscription plan
  const { UserSubscriptionService } = require("../../services/userSubscription.service");
  const enrollment = await UserSubscriptionService.getHighestPriorityPlan(userId);

  // If no active plan, return FREE plan benefits
  if (!enrollment) {
    return defaultBenefits;
  }

  const planType = (enrollment.plan as any).planType;

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

const buildEnrollmentAmounts = async (
  userId: string,
  courseDetails: any,
  numberOfPeople: number,
  pointsToRedeem?: number
) => {
  const isFree = courseDetails.isFree;
  const benefits = await getCourseAccessBenefits(userId);

  // if (courseDetails.certificate && !benefits.canGetSkillCertification) {
  //   throw new ApiError(
  //     403,
  //     "You are not eligible for skill certification with your current plan. Upgrade to BASIC or PREMIUM."
  //   );
  // }

  // Removed restriction: allow enrollment for certificate courses regardless of subscription plan.
  // Certification issuance will be governed separately based on the user's plan at the time of certification.

  const baseAmount = Math.round(courseDetails.amount * numberOfPeople);
  let discountAmount = 0;
  let finalAmount = baseAmount;

  if (!isFree && benefits.trainingFeeDiscount > 0) {
    discountAmount = Math.round(
      (baseAmount * benefits.trainingFeeDiscount) / 100
    );
    finalAmount = Math.max(0, Math.round(baseAmount - discountAmount));
  }

  let pointsRedeemed = 0;
  let pointsValue = 0;

  if (!isFree && finalAmount > 0) {
    const redemption = await redeemUserPoints(
      userId,
      finalAmount,
      normalizePoints(pointsToRedeem)
    );
    pointsRedeemed = redemption.pointsRedeemed;
    pointsValue = redemption.pointsValue;
    finalAmount = redemption.finalAmount;
  }

  return {
    isFree,
    baseAmount,
    finalAmount,
    pointsRedeemed,
    pointsValue,
  };
};

const refundEnrollmentPointsIfNeeded = async (enrollment: any) => {
  if (enrollment?.pointsRedeemed > 0 && !enrollment?.pointsRefunded) {
    await refundUserPoints(String(enrollment.user), enrollment.pointsRedeemed);
    enrollment.pointsRefunded = true;
  }
};

const normalizeEnrollmentQuantity = (
  numberOfPeople: unknown,
  userType: string
) => {
  const parsed = Number(numberOfPeople);
  const normalized = Number.isFinite(parsed) ? Math.floor(parsed) : 1;

  if (normalized < 1) {
    throw new ApiError(400, "numberOfPeople must be at least 1");
  }

  if (String(userType) === "worker" && normalized !== 1) {
    throw new ApiError(
      400,
      "Workers can only be enrolled with quantity 1"
    );
  }

  return normalized;
};

const parseTimeToMinutes = (rawTime?: string): number | null => {
  const normalized = String(rawTime || "").trim();
  if (!normalized) return null;

  const twentyFourHourMatch = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);
    return hours * 60 + minutes;
  }

  const twelveHourMatch = normalized.match(
    /^(0?\d|1[0-2]):([0-5]\d)\s*([aApP][mM])$/
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
  const baseDate = new Date(session?.date);
  if (Number.isNaN(baseDate.getTime())) return null;

  const startDate = new Date(baseDate);
  const minutes = parseTimeToMinutes(session?.startTime);
  if (minutes !== null) {
    startDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  } else {
    startDate.setHours(0, 0, 0, 0);
  }
  return startDate;
};

const getCourseStartReference = (courseDetails: any): Date | null => {
  const schedule = Array.isArray(courseDetails?.classSchedule)
    ? courseDetails.classSchedule
    : [];

  const starts = schedule
    .filter((session: any) => session && session.isActive !== false)
    .map((session: any) => buildSessionStartDate(session))
    .filter((date: Date | null): date is Date => Boolean(date));

  if (starts.length > 0) {
    return new Date(
      Math.min(...starts.map((date: Date) => date.getTime()))
    );
  }

  if (courseDetails?.startDate) {
    const startDate = new Date(courseDetails.startDate);
    if (!Number.isNaN(startDate.getTime())) return startDate;
  }

  return null;
};

const assertCourseEnrollmentWindow = (courseDetails: any) => {
  const now = new Date();
  const startReference = getCourseStartReference(courseDetails);
  const endDate =
    courseDetails?.endDate && !Number.isNaN(new Date(courseDetails.endDate).getTime())
      ? new Date(courseDetails.endDate)
      : null;

  if (endDate && now.getTime() > endDate.getTime()) {
    throw new ApiError(400, "Enrollment is closed. Course has already ended.");
  }

  if (!startReference) return;

  const lockAt = new Date(
    startReference.getTime() - ENROLLMENT_LOCK_HOURS * 60 * 60 * 1000
  );
  if (now.getTime() >= lockAt.getTime()) {
    throw new ApiError(
      400,
      `Enrollment is closed for this course. New enrollments stop ${ENROLLMENT_LOCK_HOURS} hours before first class start.`
    );
  }
};

const assertCourseSeatAvailability = async (
  courseDetails: any,
  requestedSeats: number,
  excludeEnrollmentId?: string
) => {
  const schedule = Array.isArray(courseDetails?.classSchedule)
    ? courseDetails.classSchedule
    : [];
  const seatLimits = schedule
    .filter((session: any) => session && session.isActive !== false)
    .map((session: any) => Number(session?.maxStudents || 0))
    .filter((limit: number) => Number.isFinite(limit) && limit > 0);

  if (!seatLimits.length) return;

  const match: Record<string, any> = {
    course: new mongoose.Types.ObjectId(String(courseDetails._id)),
    status: {
      $in: [
        EnrollmentStatus.ACTIVE,
        EnrollmentStatus.PENDING,
        EnrollmentStatus.COMPLETED,
      ],
    },
  };
  if (excludeEnrollmentId && mongoose.Types.ObjectId.isValid(excludeEnrollmentId)) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeEnrollmentId) };
  }

  const participantsAgg = await Enrollment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        participants: { $sum: { $ifNull: ["$numberOfPeople", 1] } },
      },
    },
  ]);
  const enrolledParticipants = Number(participantsAgg?.[0]?.participants || 0);
  const maxAllowedParticipants = Math.min(...seatLimits);
  const remainingSeats = maxAllowedParticipants - enrolledParticipants;

  if (remainingSeats < requestedSeats) {
    throw new ApiError(
      400,
      `Only ${Math.max(remainingSeats, 0)} seat(s) are available for this course schedule.`
    );
  }
};

const assertCourseEnrollmentEligibility = async (
  courseDetails: any,
  requestedSeats: number,
  excludeEnrollmentId?: string
) => {
  assertCourseEnrollmentWindow(courseDetails);
  await assertCourseSeatAvailability(
    courseDetails,
    requestedSeats,
    excludeEnrollmentId
  );
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class EnrollmentController {
  static async adminAssignCourse(req: any, res: Response, next: NextFunction) {
    try {
      const { userId, courseId, numberOfPeople = 1 } = req.body || {};

      if (!userId || !courseId) {
        return res
          .status(400)
          .json(new ApiError(400, "userId and courseId are required"));
      }

      const [targetUser, courseDetails] = await Promise.all([
        User.findById(userId).select("_id userType"),
        Course.findById(courseId).select("_id amount startDate endDate classSchedule"),
      ]);

      if (!targetUser) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }

      if (!courseDetails) {
        return res.status(404).json(new ApiError(404, "Course not found"));
      }

      const normalizedNumberOfPeople = normalizeEnrollmentQuantity(
        numberOfPeople,
        String(targetUser.userType || "")
      );

      const existing = await Enrollment.findOne({ user: userId, course: courseId });
      await assertCourseEnrollmentEligibility(
        courseDetails,
        normalizedNumberOfPeople,
        existing?._id?.toString()
      );

      const totalAmount = Math.round(
        Number(courseDetails.amount || 0) * normalizedNumberOfPeople
      );
      const assignedAt = new Date();

      const payload: any = {
        user: userId,
        course: courseId,
        progress: 0,
        enrolledAt: assignedAt,
        numberOfPeople: normalizedNumberOfPeople,
        totalAmount,
        finalAmount: 0,
        pointsRedeemed: 0,
        pointsValue: 0,
        pointsRefunded: false,
        appliedCoupon: undefined,
        refundReason: undefined,
        refundedAt: undefined,
        status: EnrollmentStatus.ACTIVE,
        paymentDetails: {
          amount: 0,
          currency: "INR",
          paidAt: assignedAt,
          status: PaymentStatus.SUCCESS,
          gateway: PaymentGateway.ADMIN_ASSIGN,
          paymentId: `admin_course_${Date.now()}`,
        },
      };

      let result;
      let statusCode = 201;
      let message = "Course assigned successfully";

      if (existing) {
        await refundEnrollmentPointsIfNeeded(existing);
        Object.assign(existing, payload);
        result = await existing.save();
        statusCode = 200;
        message = "Course assignment updated successfully";
      } else {
        result = await enrollmentService.create(payload);
      }

      return res
        .status(statusCode)
        .json(new ApiResponse(200, result, message));
    } catch (err) {
      next(err);
    }
  }

  static async createEnrollment(req: any, res: Response, next: NextFunction) {
    try {
      const { course, numberOfPeople = 1, pointsToRedeem } = req.body;
      const { id: user } = req.user;
      const targetUser = await User.findById(user).select("_id userType");
      if (!targetUser) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }

      const normalizedNumberOfPeople = normalizeEnrollmentQuantity(
        numberOfPeople,
        String(targetUser.userType || "")
      );

      const exists = await Enrollment.findOne({ user, course });
      if (exists) {
        switch (exists.status) {
          case EnrollmentStatus.ACTIVE:
            return res
              .status(409)
              .json(new ApiError(409, "Already enrolled in this course", exists));

          case EnrollmentStatus.PENDING:
            return res
              .status(202)
              .json(
                new ApiResponse(
                  202,
                  exists,
                  "Enrollment is already in progress"
                )
              );

          case EnrollmentStatus.COMPLETED:
            return res
              .status(409)
              .json(
                new ApiError(409, "You have already completed this course")
              );

          case EnrollmentStatus.FAILED:
          case EnrollmentStatus.REFUNDED:
          case EnrollmentStatus.CANCELLED:
            const courseDetails = await Course.findById(course);
            if (!courseDetails)
              return res
                .status(404)
                .json(new ApiError(404, "Course doesn't exist or was not found"));

            await assertCourseEnrollmentEligibility(
              courseDetails,
              normalizedNumberOfPeople,
              exists?._id?.toString()
            );

            await refundEnrollmentPointsIfNeeded(exists);

            const {
              isFree,
              baseAmount,
              finalAmount,
              pointsRedeemed,
              pointsValue,
            } = await buildEnrollmentAmounts(
              user,
              courseDetails,
              normalizedNumberOfPeople,
              pointsToRedeem
            );

            exists.numberOfPeople = normalizedNumberOfPeople;
            exists.totalAmount = baseAmount;
            exists.finalAmount = finalAmount;
            exists.pointsRedeemed = pointsRedeemed;
            exists.pointsValue = pointsValue;
            exists.pointsRefunded = false;
            exists.status = isFree
              ? EnrollmentStatus.ACTIVE
              : EnrollmentStatus.PENDING;

            if (isFree) {
              exists.paymentDetails = {
                amount: 0,
                currency: "INR",
                paidAt: new Date(),
                status: PaymentStatus.SUCCESS,
                gateway: PaymentGateway.FREE,
              };
            } else {
              exists.paymentDetails = undefined;
            }

            await exists.save();
            return res
              .status(200)
              .json(
                new ApiResponse(
                  200,
                  exists,
                  "Re-enrollment initiated after previous failure/refund/cancellation"
                )
              );

          default:
            return res
              .status(400)
              .json(new ApiError(400, "Unknown enrollment status"));
        }
      }

      const courseDetails = await Course.findById(course);
      if (!courseDetails)
        return res
          .status(404)
          .json(new ApiError(404, "Course doesn't exist or was not found"));

      await assertCourseEnrollmentEligibility(
        courseDetails,
        normalizedNumberOfPeople
      );

      const {
        isFree,
        baseAmount,
        finalAmount,
        pointsRedeemed,
        pointsValue,
      } = await buildEnrollmentAmounts(
        user,
        courseDetails,
        normalizedNumberOfPeople,
        pointsToRedeem
      );

      const data: any = {
        user,
        course,
        numberOfPeople: normalizedNumberOfPeople,
        totalAmount: baseAmount,
        finalAmount,
        pointsRedeemed,
        pointsValue,
        pointsRefunded: false,
        status: isFree ? EnrollmentStatus.ACTIVE : EnrollmentStatus.PENDING,
      };

      // Add instant payment success if free
      if (isFree) {
        data.paymentDetails = {
          amount: 0,
          currency: "INR",
          paidAt: new Date(),
          status: PaymentStatus.SUCCESS,
          gateway: PaymentGateway.FREE,
        };
      }

      const result = await enrollmentService.create(data);
      if (!result) {
        if (pointsRedeemed > 0) {
          await refundUserPoints(user, pointsRedeemed);
        }
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create enrollment"));
      }

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            isFree
              ? "Enrolled successfully in free course"
              : "Enrollment created, pending payment"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllEnrollments(req: any, res: Response, next: NextFunction) {
    try {
      const { id: user } = req.user;
      const result = await enrollmentService.getAll({ ...req.query, user });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Enrollments fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllAdminEnrollments(
    req: any,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "courses",
            localField: "course",
            foreignField: "_id",
            as: "courseDetails",
          },
        },
        { $unwind: "$courseDetails" },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $project: {
            _id: 1,
            status: 1,
            progress: 1,
            createdAt: 1,
            updatedAt: 1,
            enrolledAt: 1,
            numberOfPeople: 1,
            totalAmount: 1,
            finalAmount: 1,
            paymentDetails: 1,
            certificateStatus: 1,
            certificateIssuedAt: 1,
            adminRemark: 1,
            adminRemarkUpdatedAt: 1,
            "userDetails.email": 1,
            "userDetails.mobile": 1,
            "courseDetails.name": 1,
            "courseDetails.type": 1,
            "courseDetails.isFree": 1,
            "courseDetails.amount": 1,
            "userDetails.fullName": 1,
            "userDetails.userType": 1,
          },
        },
      ];

      const result = await enrollmentService.getAll({ ...req.query }, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Enrollments fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateParticipantRemarkByAdmin(
    req: any,
    res: Response,
    next: NextFunction
  ) {
    try {
      const enrollmentId = String(req.params.id || "").trim();
      if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
        return res.status(400).json(new ApiError(400, "Invalid enrollment id"));
      }

      const remarkValue = req.body?.remark;
      if (remarkValue !== undefined && typeof remarkValue !== "string") {
        return res
          .status(400)
          .json(new ApiError(400, "Remark must be a string"));
      }

      const normalizedRemark = String(remarkValue || "").trim();
      if (normalizedRemark.length > 2000) {
        return res
          .status(400)
          .json(new ApiError(400, "Remark cannot exceed 2000 characters"));
      }

      const enrollment = await Enrollment.findById(enrollmentId);
      if (!enrollment) {
        return res.status(404).json(new ApiError(404, "Enrollment not found"));
      }

      enrollment.adminRemark = normalizedRemark || undefined;
      enrollment.adminRemarkUpdatedAt = new Date();
      enrollment.adminRemarkUpdatedBy = req.user?.id;
      await enrollment.save();

      return res
        .status(200)
        .json(
          new ApiResponse(200, enrollment, "Participant remark updated successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getCourseWiseEnrollmentStats(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
      const limit = Math.max(
        parseInt(String(req.query.limit || "10"), 10) || 10,
        1
      );

      const rawSortKey = String(req.query.sortKey || "totalParticipants");
      const rawSortDir = String(
        req.query.sortDir || req.query.sortdir || "-1"
      ).toLowerCase();
      const sortDirection = rawSortDir === "asc" || rawSortDir === "1" ? 1 : -1;
      const allowedSortKeys = new Set([
        "courseName",
        "courseType",
        "courseStatus",
        "courseAmount",
        "totalEnrollments",
        "totalParticipants",
        "uniqueUsers",
        "workerParticipants",
        "employerParticipants",
        "agencyParticipants",
        "activeEnrollments",
        "pendingEnrollments",
        "completedEnrollments",
        "failedEnrollments",
        "cancelledEnrollments",
        "refundedEnrollments",
        "averageProgress",
        "totalExpectedAmount",
        "totalFinalAmountCollected",
        "firstEnrolledAt",
        "lastEnrolledAt",
      ]);
      const sortKey = allowedSortKeys.has(rawSortKey)
        ? rawSortKey
        : "totalParticipants";

      const search = String(req.query.search || "").trim();
      const searchKey = String(req.query.searchkey || "courseName").trim();
      const requestedCourseType = String(req.query.type || "")
        .trim()
        .toLowerCase();
      const requestedCourseStatus = String(req.query.courseStatus || "")
        .trim()
        .toLowerCase();

      const pipeline: any[] = [
        {
          $lookup: {
            from: "courses",
            localField: "course",
            foreignField: "_id",
            as: "courseDetails",
          },
        },
        { $unwind: "$courseDetails" },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      const preGroupMatch: Record<string, any> = {};
      if (requestedCourseType && requestedCourseType !== "all") {
        preGroupMatch["courseDetails.type"] = {
          $regex: new RegExp(
            `(^|,\\s*)${escapeRegex(requestedCourseType)}(\\s*,|$)`,
            "i"
          ),
        };
      }
      if (requestedCourseStatus && requestedCourseStatus !== "all") {
        preGroupMatch["courseDetails.status"] = requestedCourseStatus;
      }
      if (Object.keys(preGroupMatch).length > 0) {
        pipeline.push({ $match: preGroupMatch });
      }

      if (search) {
        const regex = new RegExp(escapeRegex(search), "i");
        const searchConditions: any[] = [];
        switch (searchKey) {
          case "courseName":
            searchConditions.push({ "courseDetails.name": { $regex: regex } });
            break;
          case "courseType":
            searchConditions.push({ "courseDetails.type": { $regex: regex } });
            break;
          case "courseStatus":
            searchConditions.push({ "courseDetails.status": { $regex: regex } });
            break;
          default:
            searchConditions.push({ "courseDetails.name": { $regex: regex } });
            searchConditions.push({ "courseDetails.type": { $regex: regex } });
            searchConditions.push({ "courseDetails.status": { $regex: regex } });
            break;
        }
        if (searchConditions.length > 0) {
          pipeline.push({ $match: { $or: searchConditions } });
        }
      }

      pipeline.push(
        {
          $group: {
            _id: "$courseDetails._id",
            courseName: { $first: "$courseDetails.name" },
            courseType: { $first: "$courseDetails.type" },
            courseStatus: { $first: "$courseDetails.status" },
            courseAmount: { $first: "$courseDetails.amount" },
            isFree: { $first: "$courseDetails.isFree" },
            firstEnrolledAt: { $min: "$enrolledAt" },
            lastEnrolledAt: { $max: "$enrolledAt" },
            totalEnrollments: { $sum: 1 },
            totalParticipants: { $sum: { $ifNull: ["$numberOfPeople", 1] } },
            uniqueUsersSet: { $addToSet: "$user" },
            workerParticipants: {
              $sum: {
                $cond: [
                  { $eq: ["$userDetails.userType", "worker"] },
                  { $ifNull: ["$numberOfPeople", 1] },
                  0,
                ],
              },
            },
            employerParticipants: {
              $sum: {
                $cond: [
                  { $eq: ["$userDetails.userType", "employer"] },
                  { $ifNull: ["$numberOfPeople", 1] },
                  0,
                ],
              },
            },
            agencyParticipants: {
              $sum: {
                $cond: [
                  { $eq: ["$userDetails.userType", "contractor"] },
                  { $ifNull: ["$numberOfPeople", 1] },
                  0,
                ],
              },
            },
            activeEnrollments: {
              $sum: {
                $cond: [{ $eq: ["$status", EnrollmentStatus.ACTIVE] }, 1, 0],
              },
            },
            pendingEnrollments: {
              $sum: {
                $cond: [{ $eq: ["$status", EnrollmentStatus.PENDING] }, 1, 0],
              },
            },
            completedEnrollments: {
              $sum: {
                $cond: [{ $eq: ["$status", EnrollmentStatus.COMPLETED] }, 1, 0],
              },
            },
            failedEnrollments: {
              $sum: {
                $cond: [{ $eq: ["$status", EnrollmentStatus.FAILED] }, 1, 0],
              },
            },
            cancelledEnrollments: {
              $sum: {
                $cond: [{ $eq: ["$status", EnrollmentStatus.CANCELLED] }, 1, 0],
              },
            },
            refundedEnrollments: {
              $sum: {
                $cond: [{ $eq: ["$status", EnrollmentStatus.REFUNDED] }, 1, 0],
              },
            },
            averageProgress: { $avg: { $ifNull: ["$progress", 0] } },
            totalExpectedAmount: { $sum: { $ifNull: ["$totalAmount", 0] } },
            totalFinalAmountCollected: { $sum: { $ifNull: ["$finalAmount", 0] } },
          },
        },
        {
          $project: {
            _id: 1,
            isFree: 1,
            courseName: 1,
            courseType: 1,
            courseStatus: 1,
            courseAmount: 1,
            firstEnrolledAt: 1,
            lastEnrolledAt: 1,
            totalEnrollments: 1,
            totalParticipants: 1,
            workerParticipants: 1,
            employerParticipants: 1,
            agencyParticipants: 1,
            activeEnrollments: 1,
            pendingEnrollments: 1,
            completedEnrollments: 1,
            failedEnrollments: 1,
            cancelledEnrollments: 1,
            refundedEnrollments: 1,
            totalExpectedAmount: 1,
            totalFinalAmountCollected: 1,
            uniqueUsers: { $size: "$uniqueUsersSet" },
            averageProgress: { $round: ["$averageProgress", 2] },
          },
        },
        {
          $facet: {
            result: [
              { $sort: { [sortKey]: sortDirection, courseName: 1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
            ],
            totalCount: [{ $count: "count" }],
            summary: [
              {
                $group: {
                  _id: null,
                  totalCourses: { $sum: 1 },
                  totalEnrollments: { $sum: "$totalEnrollments" },
                  totalParticipants: { $sum: "$totalParticipants" },
                  totalUniqueUsers: { $sum: "$uniqueUsers" },
                  totalExpectedAmount: { $sum: "$totalExpectedAmount" },
                  totalFinalAmountCollected: { $sum: "$totalFinalAmountCollected" },
                },
              },
              {
                $project: {
                  _id: 0,
                  totalCourses: 1,
                  totalEnrollments: 1,
                  totalParticipants: 1,
                  totalUniqueUsers: 1,
                  totalExpectedAmount: 1,
                  totalFinalAmountCollected: 1,
                },
              },
            ],
          },
        }
      );

      const aggregated = await Enrollment.aggregate(pipeline);
      const payload = aggregated?.[0] || {};
      const result = payload?.result || [];
      const totalItems = payload?.totalCount?.[0]?.count || 0;
      const summary = payload?.summary?.[0] || {
        totalCourses: 0,
        totalEnrollments: 0,
        totalParticipants: 0,
        totalUniqueUsers: 0,
        totalExpectedAmount: 0,
        totalFinalAmountCollected: 0,
      };

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            result,
            summary,
            pagination: {
              totalItems,
              currentPage: page,
              itemsPerPage: limit,
              totalPages: Math.max(1, Math.ceil(totalItems / limit)),
            },
          },
          "Course-wise enrollment stats fetched successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getCourseParticipantsByCourse(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { courseId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json(new ApiError(400, "Invalid courseId"));
      }

      const courseDetails = await Course.findById(courseId).select(
        "_id name type status amount isFree"
      );
      if (!courseDetails) {
        return res.status(404).json(new ApiError(404, "Course not found"));
      }

      const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
      const limit = Math.max(
        parseInt(String(req.query.limit || "10"), 10) || 10,
        1
      );
      const userTypeFilter = String(req.query.userType || "")
        .trim()
        .toLowerCase();
      const search = String(req.query.search || "").trim();
      const searchKey = String(req.query.searchkey || "userName").trim();

      const rawSortKey = String(req.query.sortKey || "enrolledAt");
      const rawSortDir = String(
        req.query.sortDir || req.query.sortdir || "-1"
      ).toLowerCase();
      const sortDirection = rawSortDir === "asc" || rawSortDir === "1" ? 1 : -1;
      const allowedSortKeys = new Set([
        "userName",
        "userType",
        "email",
        "mobile",
        "enrollmentStatus",
        "numberOfPeople",
        "progress",
        "enrolledAt",
        "finalAmount",
        "totalAmount",
      ]);
      const sortKey = allowedSortKeys.has(rawSortKey) ? rawSortKey : "enrolledAt";

      const pipeline: any[] = [
        {
          $match: {
            course: new mongoose.Types.ObjectId(courseId),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            enrolledAt: 1,
            progress: { $ifNull: ["$progress", 0] },
            numberOfPeople: { $ifNull: ["$numberOfPeople", 1] },
            totalAmount: { $ifNull: ["$totalAmount", 0] },
            finalAmount: { $ifNull: ["$finalAmount", 0] },
            enrollmentStatus: "$status",
            certificateStatus: "$certificateStatus",
            certificateIssuedAt: "$certificateIssuedAt",
            adminRemark: "$adminRemark",
            adminRemarkUpdatedAt: "$adminRemarkUpdatedAt",
            paymentDetails: 1,
            userId: "$userDetails._id",
            userKey: "$userDetails.userKey",
            userName: "$userDetails.fullName",
            userType: "$userDetails.userType",
            email: "$userDetails.email",
            mobile: "$userDetails.mobile",
            accountStatus: "$userDetails.status",
            city: "$userDetails.primaryLocation.city",
            state: "$userDetails.primaryLocation.state",
          },
        },
      ];

      if (userTypeFilter && userTypeFilter !== "all") {
        pipeline.push({ $match: { userType: userTypeFilter } });
      }

      if (search) {
        const regex = new RegExp(escapeRegex(search), "i");
        const searchConditions: any[] = [];
        switch (searchKey) {
          case "userName":
            searchConditions.push({ userName: { $regex: regex } });
            break;
          case "email":
            searchConditions.push({ email: { $regex: regex } });
            break;
          case "mobile":
            searchConditions.push({ mobile: { $regex: regex } });
            break;
          case "userType":
            searchConditions.push({ userType: { $regex: regex } });
            break;
          case "userKey":
            searchConditions.push({ userKey: { $regex: regex } });
            break;
          default:
            searchConditions.push({ userName: { $regex: regex } });
            searchConditions.push({ email: { $regex: regex } });
            searchConditions.push({ mobile: { $regex: regex } });
            searchConditions.push({ userType: { $regex: regex } });
            searchConditions.push({ userKey: { $regex: regex } });
            break;
        }
        if (searchConditions.length > 0) {
          pipeline.push({ $match: { $or: searchConditions } });
        }
      }

      pipeline.push({
        $facet: {
          result: [
            { $sort: { [sortKey]: sortDirection, userName: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          totalCount: [{ $count: "count" }],
          summary: [
            {
              $group: {
                _id: "$userType",
                uniqueUsersSet: { $addToSet: "$userId" },
                enrollmentCount: { $sum: 1 },
                participantCount: { $sum: "$numberOfPeople" },
              },
            },
            {
              $addFields: {
                uniqueUsers: { $size: "$uniqueUsersSet" },
              },
            },
            {
              $group: {
                _id: null,
                byUserType: {
                  $push: {
                    userType: "$_id",
                    uniqueUsers: "$uniqueUsers",
                    enrollmentCount: "$enrollmentCount",
                    participantCount: "$participantCount",
                  },
                },
                totalEnrollments: { $sum: "$enrollmentCount" },
                totalParticipants: { $sum: "$participantCount" },
                totalUniqueUsers: { $sum: "$uniqueUsers" },
              },
            },
            {
              $project: {
                _id: 0,
                byUserType: 1,
                totalEnrollments: 1,
                totalParticipants: 1,
                totalUniqueUsers: 1,
              },
            },
          ],
        },
      });

      const aggregated = await Enrollment.aggregate(pipeline);
      const payload = aggregated?.[0] || {};
      const result = payload?.result || [];
      const totalItems = payload?.totalCount?.[0]?.count || 0;
      const summary = payload?.summary?.[0] || {
        byUserType: [],
        totalEnrollments: 0,
        totalParticipants: 0,
        totalUniqueUsers: 0,
      };

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            course: courseDetails,
            summary,
            result,
            pagination: {
              totalItems,
              currentPage: page,
              itemsPerPage: limit,
              totalPages: Math.max(1, Math.ceil(totalItems / limit)),
            },
          },
          "Course participant details fetched successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getEnrollmentById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await enrollmentService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "Enrollment not found"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Enrollment fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async issueCertificateByAdmin(
    req: any,
    res: Response,
    next: NextFunction
  ) {
    try {
      const enrollmentId = String(req.params.id || "").trim();
      if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
        return res.status(400).json(new ApiError(400, "Invalid enrollment id"));
      }

      const enrollment = await Enrollment.findById(enrollmentId);
      if (!enrollment) {
        return res.status(404).json(new ApiError(404, "Enrollment not found"));
      }

      const enrollmentStatus = String(enrollment.status || "").toLowerCase();
      if (
        [
          EnrollmentStatus.FAILED,
          EnrollmentStatus.CANCELLED,
          EnrollmentStatus.REFUNDED,
        ].includes(enrollmentStatus as EnrollmentStatus)
      ) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Certificate cannot be issued for failed/cancelled/refunded enrollments."
            )
          );
      }

      const progress = Number(enrollment.progress || 0);
      if (progress < 100 && enrollmentStatus !== EnrollmentStatus.COMPLETED) {
        return res.status(400).json(
          new ApiError(
            400,
            "Certificate can be issued only after course completion."
          )
        );
      }

      const courseDetails = await Course.findById(enrollment.course).select(
        "_id name certificate"
      );
      if (!courseDetails) {
        return res.status(404).json(new ApiError(404, "Course not found"));
      }
      if (!String(courseDetails.certificate || "").trim()) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "This course does not have a certificate template configured."
            )
          );
      }

      enrollment.certificateStatus = "issued";
      enrollment.certificateIssuedAt = new Date();
      enrollment.certificateIssuedBy = req.user?.id;
      enrollment.certificateIssuedFor = enrollment.user;
      await enrollment.save();

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            enrollmentId: enrollment._id,
            courseId: courseDetails._id,
            courseName: courseDetails.name,
            issuedFor: enrollment.user,
            issuedAt: enrollment.certificateIssuedAt,
            certificateTemplate: courseDetails.certificate,
            certificateStatus: enrollment.certificateStatus,
          },
          "Certificate issued successfully for enrolled participant."
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async refundEnrollment(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id, reason } = req.params;

      const enrollment = await Enrollment.findById(id);
      if (!enrollment)
        return res.status(404).json(new ApiError(404, "Enrollment not found"));

      enrollment.status = EnrollmentStatus.REFUNDED;
      enrollment.refundReason = reason;
      enrollment.refundedAt = new Date();

      await refundEnrollmentPointsIfNeeded(enrollment);

      await enrollment.save();

      return res
        .status(200)
        .json(
          new ApiResponse(200, enrollment, "Enrollment refunded successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  static async updatePaymentStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { enrollmentId, status, gateway, paymentId, ...rest } = req.body;

      const enrollment = await Enrollment.findById(enrollmentId);
      if (!enrollment) {
        return res.status(404).json(new ApiError(404, "Enrollment not found"));
      }

      if (enrollment.status === EnrollmentStatus.ACTIVE)
        return res
          .status(400)
          .json(new ApiError(400, "Enrollment is already active."));

      if (enrollment.status === EnrollmentStatus.CANCELLED) {
        return res
          .status(400)
          .json(new ApiError(400, "This enrollment was cancelled."));
      }

      if (enrollment.paymentDetails?.status === PaymentStatus.SUCCESS) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Enrollment is already active. Payment is successful."
            )
          );
      }

      if (enrollment.paymentDetails?.status === PaymentStatus.REFUNDED) {
        return res
          .status(400)
          .json(new ApiError(400, "This payment has already been refunded."));
      }

      // Update payment details
      enrollment.paymentDetails = {
        rest,
        paymentId,
        currency: "INR",
        paidAt: new Date(),
        amount: enrollment.finalAmount,
        status: status as PaymentStatus,
        gateway: gateway as PaymentGateway,
      };

      // Update enrollment status
      switch (status) {
        case PaymentStatus.SUCCESS:
          enrollment.status = EnrollmentStatus.ACTIVE;
          break;
        case PaymentStatus.REFUNDED:
          enrollment.status = EnrollmentStatus.REFUNDED;
          enrollment.refundedAt = new Date();
          await refundEnrollmentPointsIfNeeded(enrollment);
          break;
        case PaymentStatus.FAILED:
          enrollment.status = EnrollmentStatus.FAILED;
          await refundEnrollmentPointsIfNeeded(enrollment);
          break;
      }

      await enrollment.save();

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            enrollment,
            "Payment status updated successfully"
          )
        );
    } catch (err) {
      next(err);
    }
  }
}
