import Otp from "../../modals/otp.model";
import { config } from "../../config/config";
import jwt, { SignOptions } from "jsonwebtoken";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { CommonService } from "../../services/common.services";
import User, { UserStatus, UserType } from "../../modals/user.model";
import { Enrollment, EnrollmentStatus } from "../../modals/enrollment.model";
import {
  EnrolledPlan,
  PlanEnrollmentStatus,
} from "../../modals/enrollplan.model";

const userService = new CommonService(User);

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email,
        mobile,
        fullName,
        userType,
        agreedToTerms,
        privacyPolicyAccepted,
      } = req.body;
      const data = {
        email,
        mobile,
        fullName,
        userType,
        agreedToTerms,
        privacyPolicyAccepted,
      };
      const result = await userService.create(data);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            `${
              userType.charAt(0).toUpperCase() + userType.slice(1)
            } created successfully`
          )
        );
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(
    req: Request | any,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { id } = req.user;
      const {
        city,
        state,
        gender,
        pincode,
        address,
        country,
        profile,
        fullName,
        jobAlerts,
        dateOfBirth,
        notifications,
        preferredLanguage,
      } = req.body;

      const data = {
        gender,
        profile,
        fullName,
        dateOfBirth,
        preferences: { preferredLanguage, notifications, jobAlerts },
        primaryLocation: { city, state, pincode, address, country },
      };

      const result = await userService.updateById(id, data);
      const { userType } = result;
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            `${
              userType.charAt(0).toUpperCase() + userType.slice(1)
            } updated successfully`
          )
        );
    } catch (error) {
      next(error);
    }
  }

  static async generateOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { mobile } = req.body;

      if (!mobile) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
      }

      const user = await User.findOne({ mobile });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "No user found with this phone number",
        });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

      // Save or update OTP
      await Otp.findOneAndUpdate(
        { mobile },
        {
          expiresAt,
          mobile,
          otp: otpCode,
          verified: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // TODO: Integrate real SMS service like Twilio or Fast2SMS
      console.log(`OTP sent to ${mobile}: ${otpCode}`);

      return res.status(200).json({
        otp: otpCode,
        success: true,
        message: "OTP has been sent successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { mobile, otp } = req.body;

      if (!mobile || !otp) {
        return res.status(400).json({
          success: false,
          message: "Phone number and OTP are required",
        });
      }

      const otpDoc = await Otp.findOne({ mobile, otp });

      if (!otpDoc || otpDoc.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      if (otpDoc.verified) {
        return res.status(400).json({
          success: false,
          message: "OTP has already been used",
        });
      }

      otpDoc.verified = true;
      await otpDoc.save();

      const user: any = await User.findOne({ mobile });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.status === UserStatus.SUSPENDED) {
        return res.status(403).json({
          success: false,
          message: "Your account is suspended. Please contact support.",
        });
      }

      if (user.status === UserStatus.INACTIVE) {
        return res.status(403).json({
          success: false,
          message: "Your account is inactive. Please contact support.",
        });
      }

      if (!user?.isMobileVerified) user.isMobileVerified = true;
      user.status = UserStatus.ACTIVE;
      await user.save();

      const payload = {
        _id: user._id,
        mobile: user.mobile,
        role: user.userType,
      };
      const secret = config.jwt.secret as string;
      const expiresIn = config.jwt.expiresIn as SignOptions["expiresIn"];

      const token = jwt.sign(payload, secret, { expiresIn });

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully. Login complete.",
        token,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      let enrollmentCourses: any;
      let enrollSubscriptionPlans: any;
      const { id: userId, role } = (req as any).user;
      const result = await userService.getById(userId);
      if (role === UserType.WORKER) {
        enrollmentCourses = await Enrollment.find(
          {
            user: userId,
            status: EnrollmentStatus.ACTIVE || EnrollmentStatus.COMPLETED,
          },
          { _id: 1, course: 1 }
        );
        enrollSubscriptionPlans = await EnrolledPlan.find(
          {
            user: userId,
            status: {
              $in: [PlanEnrollmentStatus.ACTIVE],
            },
          },
          { _id: 1, plan: 1 }
        );
      }
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { user: result, enrollmentCourses, enrollSubscriptionPlans },
            `User fetched successfully`
          )
        );
    } catch (error) {
      next(error); // Pass errors to the error handling middleware
    }
  }
}
