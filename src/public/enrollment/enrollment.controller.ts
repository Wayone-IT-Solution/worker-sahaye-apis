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
        return res
          .status(409)
          .json(new ApiError(409, "Already enrolled in this course"));
      }

      const courseDetails = await Course.findById(course);
      if (!courseDetails)
        return res
          .status(404)
          .json(new ApiError(404, "Course doesn't exist or was not found"));

      const data = {
        user,
        course,
        totalAmount: courseDetails.amount,
        finalAmount: courseDetails.amount,
      };

      const result = await enrollmentService.create(data);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create enrollment"));

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Enrollment created successfully"));
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
