import {
  EnrolledPlan,
  PlanPaymentStatus,
  PlanPaymentGateway,
  PlanEnrollmentStatus,
} from "../../modals/enrollplan.model";
import {
  SubscriptionPlan,
  calculateExpiryDate,
  PlanType,
  PlanStatus,
} from "../../modals/subscriptionplan.model";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { CommonService } from "../../services/common.services";
import { User } from "../../modals/user.model";
import { redeemUserPoints, refundUserPoints, normalizePoints } from "../../utils/points";

const enrollPlanService = new CommonService(EnrolledPlan);

const buildPlanAmounts = async (
  userId: string,
  planDetails: any,
  pointsToRedeem?: number
) => {
  // If plan details are not available (plan is optional now), treat it as free with 0 price
  const isFree = planDetails ? planDetails.planType === PlanType.FREE : true;
  const baseAmount = Math.round(planDetails?.basePrice ?? 0);
  let finalAmount = baseAmount;
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

const refundPlanPointsIfNeeded = async (enrollment: any) => {
  if (enrollment?.pointsRedeemed > 0 && !enrollment?.pointsRefunded) {
    await refundUserPoints(String(enrollment.user), enrollment.pointsRedeemed);
    enrollment.pointsRefunded = true;
  }
};

const syncUserPremiumFlag = async (userId: string) => {
  const activeEnrollments = await EnrolledPlan.find({
    user: userId,
    status: PlanEnrollmentStatus.ACTIVE,
  }).populate("plan", "planType");

  const hasAnyActivePaidPlan = activeEnrollments.some((entry: any) => {
    const planType = entry?.plan?.planType;
    return planType && planType !== PlanType.FREE;
  });

  await User.findByIdAndUpdate(userId, {
    hasPremiumPlan: hasAnyActivePaidPlan,
  });
};

export class EnrollPlanController {
  static async assignPlanToUser(args: {
    adminId?: string;
    userId: string;
    planId: string;
    planDetails?: any;
    targetUser?: any;
  }) {
    const { adminId, userId, planId } = args;

    const planDetails =
      args.planDetails ?? (await SubscriptionPlan.findById(planId));
    if (!planDetails) {
      return {
        success: false,
        statusCode: 404,
        message: "Plan not found",
      };
    }

    if (planDetails.status !== PlanStatus.ACTIVE) {
      return {
        success: false,
        statusCode: 400,
        message: "Only active plans can be assigned",
      };
    }

    const targetUser =
      args.targetUser ?? (await User.findById(userId).select("_id userType"));
    if (!targetUser) {
      return {
        success: false,
        statusCode: 404,
        message: "User not found",
      };
    }

    if (String(planDetails.userType) !== String(targetUser.userType)) {
      return {
        success: false,
        statusCode: 400,
        message: `Plan userType (${planDetails.userType}) does not match userType (${targetUser.userType})`,
      };
    }

    const existing = await EnrolledPlan.findOne({ user: userId, plan: planId });
    if (existing?.status === PlanEnrollmentStatus.ACTIVE) {
      return {
        success: false,
        statusCode: 409,
        message: "User already has this active plan",
        data: existing,
      };
    }

    const enrolledAt = new Date();
    const expiredAt = planDetails.billingCycle
      ? calculateExpiryDate(enrolledAt, planDetails.billingCycle)
      : undefined;

    const payload: any = {
      user: userId,
      plan: planId,
      assignedBy: adminId || null,
      enrolledAt,
      expiredAt,
      totalAmount: Math.round(planDetails.basePrice ?? 0),
      finalAmount: 0,
      pointsRedeemed: 0,
      pointsValue: 0,
      pointsRefunded: false,
      status: PlanEnrollmentStatus.ACTIVE,
      paymentDetails: {
        amount: 0,
        currency: "INR",
        paidAt: enrolledAt,
        status: PlanPaymentStatus.SUCCESS,
        gateway: PlanPaymentGateway.ADMIN_ASSIGN,
        paymentId: `admin_${Date.now()}`,
      },
    };

    let result;
    if (existing) {
      await refundPlanPointsIfNeeded(existing);
      Object.assign(existing, payload);
      result = await existing.save();
    } else {
      result = await enrollPlanService.create(payload);
    }

    await syncUserPremiumFlag(userId);

    return {
      success: true,
      statusCode: existing ? 200 : 201,
      message: "Plan assigned successfully",
      data: result,
    };
  }

  static async adminAssignPlan(req: any, res: Response, next: NextFunction) {
    try {
      const adminId = req?.user?.id;
      const { userId, planId } = req.body || {};

      if (!userId || !planId) {
        return res
          .status(400)
          .json(new ApiError(400, "userId and planId are required"));
      }

      const result = await EnrollPlanController.assignPlanToUser({
        adminId,
        userId,
        planId,
      });

      if (!result.success) {
        return res
          .status(result.statusCode || 400)
          .json(new ApiError(result.statusCode || 400, result.message, result.data));
      }

      return res.status(result.statusCode || 200).json(
        new ApiResponse(200, result.data, result.message || "Plan assigned successfully")
      );
    } catch (err) {
      next(err);
    }
  }

  static async adminAssignPlanBulk(req: any, res: Response, next: NextFunction) {
    try {
      const adminId = req?.user?.id;
      const { userIds, planId } = req.body || {};

      if (!Array.isArray(userIds) || userIds.length === 0 || !planId) {
        return res
          .status(400)
          .json(new ApiError(400, "userIds (array) and planId are required"));
      }

      const uniqueUserIds = Array.from(
        new Set(
          userIds
            .map((value: any) => String(value || "").trim())
            .filter((value: string) => Boolean(value))
        )
      );

      if (!uniqueUserIds.length) {
        return res
          .status(400)
          .json(new ApiError(400, "No valid userIds were provided"));
      }

      const [planDetails, users] = await Promise.all([
        SubscriptionPlan.findById(planId),
        User.find({ _id: { $in: uniqueUserIds } }).select("_id userType"),
      ]);

      if (!planDetails) {
        return res.status(404).json(new ApiError(404, "Plan not found"));
      }

      const userMap = new Map(
        users.map((entry: any) => [String(entry._id), entry])
      );

      const successes: Array<{ userId: string; enrollmentId?: string }> = [];
      const failed: Array<{ userId: string; message: string; statusCode?: number }> =
        [];

      for (const userId of uniqueUserIds) {
        const assignment = await EnrollPlanController.assignPlanToUser({
          adminId,
          userId,
          planId,
          planDetails,
          targetUser: userMap.get(userId),
        });

        if (!assignment.success) {
          failed.push({
            userId,
            message: assignment.message || "Failed to assign plan",
            statusCode: assignment.statusCode,
          });
          continue;
        }

        successes.push({
          userId,
          enrollmentId: assignment?.data?._id
            ? String(assignment.data._id)
            : undefined,
        });
      }

      const responseStatus = failed.length > 0 ? 207 : 200;
      return res.status(responseStatus).json(
        new ApiResponse(responseStatus, {
          requestedCount: uniqueUserIds.length,
          successCount: successes.length,
          failedCount: failed.length,
          successes,
          failed,
        }, "Bulk plan assignment processed")
      );
    } catch (err) {
      next(err);
    }
  }

  static async adminExpireEnrollPlan(
    req: any,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json(new ApiError(400, "Enrollment id is required"));
      }

      const enrollment = await EnrolledPlan.findById(id).populate("plan", "planType");
      if (!enrollment) {
        return res.status(404).json(new ApiError(404, "Enrollment not found"));
      }

      if (enrollment.status === PlanEnrollmentStatus.EXPIRED) {
        return res.status(200).json(
          new ApiResponse(200, enrollment, "Enrollment is already expired")
        );
      }

      enrollment.status = PlanEnrollmentStatus.EXPIRED;
      enrollment.expiredAt = new Date();
      await enrollment.save();

      await syncUserPremiumFlag(String(enrollment.user));

      return res
        .status(200)
        .json(new ApiResponse(200, enrollment, "Enrollment marked as expired"));
    } catch (err) {
      next(err);
    }
  }

  static async createEnrollPlan(req: any, res: Response, next: NextFunction) {
    try {
      const { plan, pointsToRedeem } = req.body;
      const { id: user, role } = req.user;

      const exists = await EnrolledPlan.findOne({ user, plan });
      if (exists) {
        switch (exists.status) {
          case PlanEnrollmentStatus.ACTIVE:
            return res
              .status(409)
              .json(new ApiError(409, "Already enrolled in this plan", exists));

          case PlanEnrollmentStatus.FAILED:
          case PlanEnrollmentStatus.EXPIRED:
          case PlanEnrollmentStatus.REFUNDED:
          case PlanEnrollmentStatus.CANCELLED: {
            const planDetails = await SubscriptionPlan.findById(plan);
            // Plan is optional now. Do not return 404 if plan is not found.
            // Any user type can purchase, so skip the userType availability check.
            // if (!planDetails)
            //   return res
            //     .status(404)
            //     .json(new ApiError(404, "Plan not found or unavailable"));

            // if (planDetails?.userType !== role) {
            //   return res
            //     .status(403)
            //     .json(
            //       new ApiError(
            //         403,
            //         `This plan is not available for ${role} users.`
            //       )
            //     );
            // }

            await refundPlanPointsIfNeeded(exists);

            const {
              isFree,
              baseAmount,
              finalAmount,
              pointsRedeemed,
              pointsValue,
            } = await buildPlanAmounts(user, planDetails, pointsToRedeem);

            exists.enrolledAt = new Date();
            exists.totalAmount = baseAmount;
            exists.finalAmount = finalAmount;
            exists.pointsRedeemed = pointsRedeemed;
            exists.pointsValue = pointsValue;
            exists.pointsRefunded = false;
            exists.status = isFree
              ? PlanEnrollmentStatus.ACTIVE
              : PlanEnrollmentStatus.PENDING;

            if (planDetails?.billingCycle) {
              exists.expiredAt = calculateExpiryDate(
                exists.enrolledAt,
                planDetails.billingCycle
              );
            }

            if (isFree) {
              exists.paymentDetails = {
                amount: 0,
                currency: "INR",
                paidAt: new Date(),
                status: PlanPaymentStatus.SUCCESS,
                gateway: PlanPaymentGateway.FREE,
              };
            } else {
              exists.paymentDetails = undefined;
            }

            await exists.save();

            if (!isFree) {
              await User.findByIdAndUpdate(user, {
                hasPremiumPlan: true,
              });
            }

            return res
              .status(200)
              .json(
                new ApiResponse(
                  200,
                  exists,
                  "Re-enrollment initiated after previous failure/refund/cancellation"
                )
              );
          }

          case PlanEnrollmentStatus.PENDING:
            return res
              .status(202)
              .json(
                new ApiResponse(
                  202,
                  exists,
                  "Enrollment is already in progress"
                )
              );

          default:
            return res
              .status(400)
              .json(new ApiError(400, "Unhandled enrollment status"));
        }
      }

      const planDetails = await SubscriptionPlan.findById(plan);
      // Plan is optional now. Do not return 404 if plan is not found.
      // Any user type can purchase, so skip the userType availability check.
      // if (!planDetails)
      //   return res
      //     .status(404)
      //     .json(new ApiError(404, "Plan not found or unavailable"));

      // if (planDetails?.userType !== role) {
      //   return res
      //     .status(403)
      //     .json(
      //       new ApiError(403, `This plan is not available for ${role} users.`)
      //     );
      // }

      const {
        isFree,
        baseAmount,
        finalAmount,
        pointsRedeemed,
        pointsValue,
      } = await buildPlanAmounts(user, planDetails, pointsToRedeem);

      const data: any = {
        user,
        plan,
        totalAmount: baseAmount,
        finalAmount,
        pointsRedeemed,
        pointsValue,
        pointsRefunded: false,
        status: isFree
          ? PlanEnrollmentStatus.ACTIVE
          : PlanEnrollmentStatus.PENDING,
      };

      if (isFree) {
        data.paymentDetails = {
          amount: 0,
          currency: "INR",
          paidAt: new Date(),
          status: PlanPaymentStatus.SUCCESS,
          gateway: PlanPaymentGateway.FREE,
        };
      }
      const result = await enrollPlanService.create(data);
      if (result && planDetails?.billingCycle) {
        const expiredAt = calculateExpiryDate(
          result.enrolledAt,
          planDetails.billingCycle
        );
        result.expiredAt = expiredAt;
        await result.save();

        if (!isFree) {
          await User.findByIdAndUpdate(user, {
            hasPremiumPlan: true,
          });
        }
      }
      if (!result) {
        if (pointsRedeemed > 0) {
          await refundUserPoints(user, pointsRedeemed);
        }
        return res
          .status(400)
          .json(new ApiError(400, "Enrollment creation failed"));
      }

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            isFree
              ? "Enrolled successfully in free plan"
              : "Enrollment initiated, awaiting payment"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllEnrollPlans(req: any, res: Response, next: NextFunction) {
    try {
      const { id: user } = req.user;
      const result = await enrollPlanService.getAll({ ...req.query, user });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Enrollments fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllEnrolled(req: any, res: Response, next: NextFunction) {
    try {
      const pipeline = [
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
          $lookup: {
            from: "subscriptionplans",
            localField: "plan",
            foreignField: "_id",
            as: "planDetails",
          },
        },
        { $unwind: "$planDetails" },
        {
          $project: {
            _id: 1,
            status: 1,
            expiredAt: 1,
            enrolledAt: 1,
            totalAmount: 1,
            finalAmount: 1,
            "userDetails.email": 1,
            "userDetails.mobile": 1,
            "userDetails.fullName": 1,
            "planDetails.planType": 1,
            "planDetails.userType": 1,
            "planDetails.basePrice": 1,
            "paymentDetails.status": 1,
            "paymentDetails.paidAt": 1,
            "paymentDetails.gateway": 1,
            "planDetails.displayName": 1,
            "planDetails.billingCycle": 1,
          },
        },
      ];
      const result = await enrollPlanService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Enrollments fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getEnrollPlanById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await enrollPlanService.getById(req.params.id, true);
      if (!result)
        return res.status(404).json(new ApiError(404, "Enrollment not found"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Enrollment fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async refundEnrollPlan(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const enrollment = await EnrolledPlan.findById(id);
      if (!enrollment)
        return res.status(404).json(new ApiError(404, "Enrollment not found"));

      if (enrollment.status === PlanEnrollmentStatus.REFUNDED)
        return res.status(400).json(new ApiError(400, "Already refunded"));

      enrollment.status = PlanEnrollmentStatus.REFUNDED;
      enrollment.refundReason = reason;
      enrollment.refundedAt = new Date();

      await refundPlanPointsIfNeeded(enrollment);

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
      const { id: user } = (req as any).user;
      const { enrollmentId, status, gateway, paymentId } = req.body;

      const enrollment = await EnrolledPlan.findById(enrollmentId);
      if (!enrollment)
        return res.status(404).json(new ApiError(404, "Enrollment not found"));

      if (
        [PlanEnrollmentStatus.ACTIVE, PlanEnrollmentStatus.REFUNDED].includes(
          enrollment.status
        )
      )
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Cannot update payment, current status is: ${enrollment.status}`
            )
          );

      enrollment.paymentDetails = {
        paymentId,
        currency: "INR",
        paidAt: new Date(),
        amount: enrollment.finalAmount,
        status,
        gateway,
      };

      switch (status) {
        case PlanPaymentStatus.SUCCESS:
          enrollment.status = PlanEnrollmentStatus.ACTIVE;
          const plan = await SubscriptionPlan.findById(enrollment.plan);
          if (plan && plan.planType !== PlanType.FREE) {
            await User.findByIdAndUpdate(user, {
              hasPremiumPlan: true,
            });
          }
          break;
        case PlanPaymentStatus.REFUNDED:
          enrollment.status = PlanEnrollmentStatus.REFUNDED;
          enrollment.refundedAt = new Date();
          await User.findByIdAndUpdate(user, {
            hasPremiumPlan: false,
          });
          await refundPlanPointsIfNeeded(enrollment);
          break;
        case PlanPaymentStatus.FAILED:
          enrollment.status = PlanEnrollmentStatus.FAILED;
          await refundPlanPointsIfNeeded(enrollment);
          break;
        default:
          enrollment.status = PlanEnrollmentStatus.PENDING;
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
