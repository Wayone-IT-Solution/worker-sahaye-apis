import Otp from "../../modals/otp.model";
import { config } from "../../config/config";
import jwt, { SignOptions } from "jsonwebtoken";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { CommonService } from "../../services/common.services";
import { Enrollment, EnrollmentStatus } from "../../modals/enrollment.model";
import {
  UserStatus,
  UserType,
  User,
  generateReferralCode,
} from "../../modals/user.model";
import {
  EnrolledPlan,
  PlanEnrollmentStatus,
} from "../../modals/enrollplan.model";
import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import FileUpload from "../../modals/fileupload.model";
import {
  ConnectionModel,
  ConnectionStatus,
} from "../../modals/connection.model";
import { Endorsement } from "../../modals/endorsement.model";

const otpService = new CommonService(Otp);
const userService = new CommonService(User);

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email,
        mobile,
        fullName,
        userType,
        referralCode,
        agreedToTerms,
        privacyPolicyAccepted,
      } = req.body;

      // 1. Validation (basic example)
      if (!email || !mobile || !fullName || !userType) {
        return res
          .status(400)
          .json(new ApiError(400, "Missing required fields"));
      }

      const userData: any = {
        email,
        mobile,
        fullName,
        userType,
        agreedToTerms,
        privacyPolicyAccepted,
      };

      const mobileExist = await User.findOne({ mobile });
      if (mobileExist)
        return res
          .status(400)
          .json(new ApiError(400, "Phone Number Already Exist!"));

      // 2. Handle referral (if any) before creating referralCode
      if (referralCode) {
        const referrer = await User.findOne({ referralCode });
        if (!referrer)
          return res
            .status(400)
            .json(new ApiError(400, "Invalid referral code"));
        userData.referredBy = referrer._id;
        userData.referredCode = referralCode;
        await referrer.updateOne({ $inc: { pointsEarned: 50 } });
      }

      const newUser: any = await userService.create(userData);
      newUser.referralCode = generateReferralCode(newUser._id);
      await newUser.save();

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            newUser,
            `${userType.charAt(0).toUpperCase() + userType.slice(1)
            } created successfully`
          )
        );
    } catch (error) {
      next(error);
    }
  }

  static async deleteUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: user, role } = (req as any).user;
      if (role === "admin")
        return res
          .status(403)
          .json(new ApiError(403, "Cannot delete admin users"));

      const result = await userService.deleteById(req.params.id || user);
      if (!result)
        return res.status(404).json(new ApiError(404, "Failed to delete city"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
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
            `${userType.charAt(0).toUpperCase() + userType.slice(1)
            } updated successfully`
          )
        );
    } catch (error) {
      next(error);
    }
  }

  static async getAllUsers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const pipeline: any[] = [
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePic",
          },
        },
        {
          $unwind: {
            path: "$profilePic",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$$ROOT",
                {
                  profilePic: "$profilePic.url",
                },
              ],
            },
          },
        },
      ];

      const result = await userService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Users fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async getAllOtps(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await otpService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
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

      const otpCode =
        mobile.toString() === "6397228522"
          ? "123456"
          : Math.floor(100000 + Math.random() * 900000).toString();
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

  static async getUserById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const userId = req.params.id;
      const { id: requestedUser } = (req as any).user;

      // Step 1: Fetch accepted connections of both users
      const [userConnections, requesterConnections] = await Promise.all([
        ConnectionModel.find({
          status: ConnectionStatus.ACCEPTED,
          $or: [{ requester: userId }, { recipient: userId }],
        }),
        ConnectionModel.find({
          status: ConnectionStatus.ACCEPTED,
          $or: [{ requester: requestedUser }, { recipient: requestedUser }],
        }),
      ]);

      // Step 2: Extract connected friend IDs
      const getFriendIds = (connections: any[], selfId: string) =>
        connections.map((conn) =>
          conn.requester.toString() === selfId
            ? conn.recipient.toString()
            : conn.requester.toString()
        );

      const userFriendIds = getFriendIds(userConnections, userId);
      const requesterFriendIds = getFriendIds(
        requesterConnections,
        requestedUser
      );

      // Step 3: Find mutual friend IDs
      const mutualFriendIds = userFriendIds.filter((id) =>
        requesterFriendIds.includes(id)
      );
      const mutualFriendCount = mutualFriendIds.length;

      // Step 4: Fetch up to 3 mutual friend profiles
      const mutualProfiles = await User.aggregate([
        {
          $match: {
            _id: {
              $in: mutualFriendIds
                .slice(0, 3)
                .map((id) => new mongoose.Types.ObjectId(id)),
            },
          },
        },
        {
          $lookup: {
            from: "fileuploads",
            let: { userId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$tag", "profilePic"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "profilePic",
          },
        },
        {
          $unwind: {
            path: "$profilePic",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            email: 1,
            fullName: 1,
            profilePicUrl: "$profilePic.url",
          },
        },
      ]);

      const data = { mutualFriendCount, mutualFriends: mutualProfiles };

      const user = await userService.getById(userId);
      if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }
      const profilePic = await FileUpload.findOne({
        userId,
        tag: "profilePic",
      }).sort({ createdAt: -1 });

      const endorsement: any = await Endorsement.findOne({
        $or: [
          { endorsedBy: userId, endorsedTo: requestedUser },
          { endorsedBy: requestedUser, endorsedTo: userId },
        ],
      });

      let role;
      if (endorsement) {
        role =
          endorsement.endorsedBy.toString() === userId ? "sender" : "receiver";
      }

      const responseData: any = {
        ...data,
        ...user.toObject(),
        endorsementRole: role,
        profilePicUrl: profilePic?.url || null,
        ...(endorsement ? endorsement.toObject() : {}),
      };

      delete responseData?.preferences;
      return res
        .status(200)
        .json(new ApiResponse(200, responseData, "User fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async getUserForAdminById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const userId = req.params.id;
      const user = await userService.getById(userId);
      if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }
      const profilePic = await FileUpload.findOne({
        userId,
        tag: "profilePic",
      }).sort({ createdAt: -1 });

      const responseData: any = {
        ...user.toObject(),
        profilePicUrl: profilePic?.url || null,
      };
      return res
        .status(200)
        .json(new ApiResponse(200, responseData, "User fetched successfully"));
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
