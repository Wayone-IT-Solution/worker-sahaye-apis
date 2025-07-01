import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import {
  Enrollment,
  PaymentStatus,
  PaymentGateway,
  EnrollmentStatus,
} from "../../modals/enrollment.model";
import { Course } from "../../modals/courses.model";
import { CommonService } from "../../services/common.services";

const enrollmentService = new CommonService(Enrollment);

export class EnrollmentController {
  static async createEnrollment(req: any, res: Response, next: NextFunction) {
    try {
      const { course } = req.body;
      const { id: user } = req.user;

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
            exists.status = EnrollmentStatus.PENDING;
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

      const isFree = courseDetails.isFree;
      const data: any = {
        user,
        course,
        totalAmount: courseDetails.amount,
        finalAmount: courseDetails.amount,
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
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create enrollment"));

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
            totalAmount: 1,
            finalAmount: 1,
            paymentDetails: 1,
            "userDetails.email": 1,
            "userDetails.mobile": 1,
            "courseDetails.name": 1,
            "courseDetails.type": 1,
            "courseDetails.isFree": 1,
            "courseDetails.amount": 1,
            "userDetails.fullName": 1,
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
          break;
        case PaymentStatus.FAILED:
          enrollment.status = EnrollmentStatus.FAILED;
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
