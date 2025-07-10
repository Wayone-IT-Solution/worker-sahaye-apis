import {
  EnrolledPlan,
  PlanPaymentStatus,
  PlanPaymentGateway,
  PlanEnrollmentStatus,
} from "../../modals/enrollplan.model";
import {
  SubscriptionPlan,
  calculateExpiryDate,
} from "../../modals/subscriptionplan.model";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { CommonService } from "../../services/common.services";
import { CandidateBrandingBadge } from "../../modals/candidatebrandingbadge.model";

const enrollPlanService = new CommonService(EnrolledPlan);

export class EnrollPlanController {
  static async createEnrollPlan(req: any, res: Response, next: NextFunction) {
    try {
      const { plan } = req.body;
      const { id: user, role } = req.user;

      const exists = await EnrolledPlan.findOne({ user, plan });
      if (exists) {
        switch (exists.status) {
          case PlanEnrollmentStatus.ACTIVE:
            return res
              .status(409)
              .json(new ApiError(409, "Already enrolled in this plan", exists));

          case PlanEnrollmentStatus.FAILED:
            // update or retry logic here
            exists.status = PlanEnrollmentStatus.PENDING;
            await exists.save();
            return res
              .status(200)
              .json(
                new ApiResponse(
                  200,
                  exists,
                  "Enrollment re-initiated after failure"
                )
              );

          case PlanEnrollmentStatus.EXPIRED:
            exists.status = PlanEnrollmentStatus.PENDING;
            await exists.save();
            return res
              .status(200)
              .json(
                new ApiResponse(
                  200,
                  exists,
                  "Re-enrollment initiated for expired plan"
                )
              );

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

          case PlanEnrollmentStatus.REFUNDED:
            exists.status = PlanEnrollmentStatus.PENDING;
            await exists.save();
            return res
              .status(200)
              .json(
                new ApiResponse(
                  200,
                  exists,
                  "Re-enrollment initiated after refund"
                )
              );

          case PlanEnrollmentStatus.CANCELLED:
            exists.status = PlanEnrollmentStatus.PENDING;
            await exists.save();
            return res
              .status(200)
              .json(
                new ApiResponse(
                  200,
                  exists,
                  "Re-enrollment initiated after cancellation"
                )
              );

          default:
            return res
              .status(400)
              .json(new ApiError(400, "Unhandled enrollment status"));
        }
      }

      const planDetails = await SubscriptionPlan.findById(plan);
      if (!planDetails)
        return res
          .status(404)
          .json(new ApiError(404, "Plan not found or unavailable"));

      if (planDetails?.userType !== role) {
        return res
          .status(403)
          .json(
            new ApiError(403, `This plan is not available for ${role} users.`)
          );
      }

      const isFree = planDetails.basePrice === 0;
      const data: any = {
        user,
        plan,
        totalAmount: planDetails.basePrice,
        finalAmount: planDetails.basePrice,
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

      if (isFree) {
        const planFeatures = await SubscriptionPlan.findById(plan).populate(
          "features"
        );
        if (!planFeatures || !planFeatures.features) {
          return res
            .status(404)
            .json(new ApiError(404, "Plan features not found"));
        }
        for (const feature of planFeatures.features) {
          if (feature.badgeKey) {
            const existingBadge = await CandidateBrandingBadge.findOne({
              user: user,
              badge: feature.badgeKey,
            });
            if (existingBadge) {
              existingBadge.status = "active";
              existingBadge.assignedAt = new Date();
              await existingBadge.save();
            } else {
              await CandidateBrandingBadge.create({
                user: user,
                status: "active",
                assignedAt: new Date(),
                badge: feature.badgeKey,
                earnedBy: "subscription",
              });
            }
          }
        }
      }

      const result = await enrollPlanService.create(data);
      if (result && planDetails.billingCycle) {
        const expiredAt = calculateExpiryDate(
          result.enrolledAt,
          planDetails.billingCycle
        );
        result.expiredAt = expiredAt;
        await result.save();
      }
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Enrollment creation failed"));

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
          break;
        case PlanPaymentStatus.REFUNDED:
          enrollment.status = PlanEnrollmentStatus.REFUNDED;
          enrollment.refundedAt = new Date();
          break;
        case PlanPaymentStatus.FAILED:
          enrollment.status = PlanEnrollmentStatus.FAILED;
          break;
        default:
          enrollment.status = PlanEnrollmentStatus.PENDING;
      }

      if (status === PlanPaymentStatus.SUCCESS) {
        const planDetails = await SubscriptionPlan.findById(
          enrollment.plan
        ).populate("features");
        if (!planDetails)
          return res
            .status(404)
            .json(new ApiError(404, "Plan not found or unavailable"));

        for (const feature of planDetails.features) {
          if (feature.badgeKey) {
            const existingBadge = await CandidateBrandingBadge.findOne({
              user: user,
              badge: feature.badgeKey,
            });
            if (existingBadge) {
              existingBadge.status = "active";
              existingBadge.assignedAt = new Date();
              await existingBadge.save();
            } else {
              await CandidateBrandingBadge.create({
                user: user,
                status: "active",
                assignedAt: new Date(),
                badge: feature.badgeKey,
                earnedBy: "subscription",
              });
            }
          }
        }
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
