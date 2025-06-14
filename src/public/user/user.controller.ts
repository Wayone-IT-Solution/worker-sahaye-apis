import jwt from "jsonwebtoken";
import Otp from "../../modals/OtpModel";
import { Request, Response, NextFunction } from "express";
import User, { UserStatus } from "../../modals/user.model";
import { CommonService } from "../../services/common.services";

const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_jwt_secret";
const userService = new CommonService(User);

export class UserController {
  static async createUser(req: Request, _: Response, next: NextFunction) {
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
      await userService.create(data);
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(
    req: Request,
    _: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      await userService.getById(req.params.id);
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(
    req: Request,
    _: Response,
    next: NextFunction
  ): Promise<any> {
    try {
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

      await userService.updateById(req.params.id, data);
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
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
      }

      const user = await User.findOne({ phoneNumber });
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
        { phoneNumber },
        {
          expiresAt,
          phoneNumber,
          otp: otpCode,
          verified: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // TODO: Integrate real SMS service like Twilio or Fast2SMS
      console.log(`OTP sent to ${phoneNumber}: ${otpCode}`);

      return res.status(200).json({
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
      const { phoneNumber, otp } = req.body;

      if (!phoneNumber || !otp) {
        return res.status(400).json({
          success: false,
          message: "Phone number and OTP are required",
        });
      }

      const otpDoc = await Otp.findOne({ phoneNumber, otp });

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

      const user: any = await User.findOne({ phoneNumber });

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

      const token = jwt.sign(
        { _id: user._id, phoneNumber: user.phoneNumber, role: user.userType },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

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
    _: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id;
      await userService.getById(userId);
    } catch (error) {
      next(error); // Pass errors to the error handling middleware
    }
  }
}
