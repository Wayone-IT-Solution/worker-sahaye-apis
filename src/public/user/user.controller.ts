import Otp from "../../modals/otp.model";
import { config } from "../../config/config";
import jwt, { SignOptions } from "jsonwebtoken";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { CommonService } from "../../services/common.services";
import { Enrollment, EnrollmentStatus } from "../../modals/enrollment.model";
import { sendEmail } from "../../utils/emailService";
import crypto from "crypto";
import {
  User,
  UserType,
  UserStatus,
  generateReferralCode,
  calculateProfileCompletion,
} from "../../modals/user.model";
import {
  EnrolledPlan,
  PlanEnrollmentStatus,
} from "../../modals/enrollplan.model";
import { PlanType } from "../../modals/subscriptionplan.model";
import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import FileUpload from "../../modals/fileupload.model";
import {
  ConnectionModel,
  ConnectionStatus,
} from "../../modals/connection.model";
import { Endorsement } from "../../modals/endorsement.model";
import { UserPreference } from "../../modals/userpreference.model";

const otpService = new CommonService(Otp);
const userService = new CommonService(User);

// Helper function to get candidate branding eligibility based on subscription plan
const getCandidateBrandingEligibility = async (userId: string | null) => {
  // Default eligibility for FREE plan (no subscription)
  const defaultEligibility = {
    planType: PlanType.FREE,
    verifiedWorker: true,
    policeVerified: true,
    fastResponder: true,
    skilledCandidate: false,
    trainedByWorkerSahay: false,
    preInterviewedCandidate: false,
    profileFeaturedToEmployers: false,
  };

  if (!userId) {
    return defaultEligibility;
  }

  // Get user's active subscription plan
  const enrolledPlan = await EnrolledPlan.findOne({
    user: userId,
    status: "active",
  }).populate("plan");

  // If no active plan, return FREE plan eligibility
  if (!enrolledPlan) {
    return defaultEligibility;
  }

  const planType = (enrolledPlan.plan as any).planType;

  // Define branding eligibility based on plan type
  const eligibilityMap: Record<
    string,
    {
      planType: string;
      verifiedWorker: boolean;
      policeVerified: boolean;
      fastResponder: boolean;
      skilledCandidate: boolean;
      trainedByWorkerSahay: boolean;
      preInterviewedCandidate: boolean;
      profileFeaturedToEmployers: boolean;
    }
  > = {
    [PlanType.FREE]: {
      planType: PlanType.FREE,
      verifiedWorker: true,
      policeVerified: true,
      fastResponder: true,
      skilledCandidate: false,
      trainedByWorkerSahay: false,
      preInterviewedCandidate: false,
      profileFeaturedToEmployers: false,
    },
    [PlanType.BASIC]: {
      planType: PlanType.BASIC,
      verifiedWorker: true,
      policeVerified: true,
      fastResponder: true,
      skilledCandidate: true,
      trainedByWorkerSahay: false,
      preInterviewedCandidate: false,
      profileFeaturedToEmployers: false,
    },
    [PlanType.PREMIUM]: {
      planType: PlanType.PREMIUM,
      verifiedWorker: true,
      policeVerified: true,
      fastResponder: true,
      skilledCandidate: true,
      trainedByWorkerSahay: true,
      preInterviewedCandidate: true,
      profileFeaturedToEmployers: true,
    },
  };

  return eligibilityMap[planType] ?? defaultEligibility;
};

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
        relocate,
        workerCategory,
      } = req.body;

      // 1. Validation (basic example)
      if (!mobile || !fullName || !userType) {
        return res
          .status(400)
          .json(new ApiError(400, "Missing required fields"));
      }

      if (
        (userType === UserType.EMPLOYER ||
          userType === UserType.CONTRACTOR) &&
        !email
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Email is required for this user type"));
      }

      const userData: any = {
        email,
        mobile,
        fullName,
        userType,
        agreedToTerms,
        privacyPolicyAccepted,
        relocate,
        workerCategory,
      };

      // Email is optional for WORKER
      if (email) {
        userData.email = email;
      }

      if (
        userType === UserType.EMPLOYER ||
        userType === UserType.CONTRACTOR
      ) {
        userData.isEmailVerified = false;
      }

      const mobileExist = await User.findOne({ mobile });
      if (mobileExist) {
        return res.status(400).json(
          new ApiError(
            400,
            `A ${mobileExist.userType} account with this phone number already exists.`
          )
        );
      }

      if (email) {
        const emailExist = await User.findOne({ email });
        if (emailExist) {
          return res.status(400).json(
            new ApiError(
              400,
              `A ${emailExist.userType} account with this email address already exists.`
            )
          );
        }
      }

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
      console.log("userData", userData);
      const newUser: any = await userService.create(userData);
      newUser.referralCode = generateReferralCode(newUser._id);
      newUser.profileCompletion = calculateProfileCompletion(newUser);

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
        dateOfBirth,
        preferences,
        relocate,
        email,
        mobile,
        workerCategory,
      } = req.body;

      // Fetch the current user to check for email/mobile changes
      const currentUser = await User.findById(id);
      if (!currentUser) {
        return res.status(404).json(
          new ApiError(404, "User not found")
        );
      }

      const data: any = {
        gender,
        profile,
        fullName,
        dateOfBirth,
        preferences, // Get the entire preferences object as sent from frontend
        relocate,
        workerCategory,
        primaryLocation: { city, state, pincode, address, country },
      };

      // Check if email was updated - if yes, set isEmailVerified to false
      if (email && email !== currentUser.email) {
        data.email = email;
        data.isEmailVerified = false;
      }

      // Check if mobile was updated - if yes, set isMobileVerified to false
      if (mobile && mobile !== currentUser.mobile) {
        data.mobile = mobile;
        data.isMobileVerified = false;
      }

      const result = await userService.updateById(id, data);
      result.profileCompletion = calculateProfileCompletion(result);
      
      // Update fast responder score if it's a worker
      if (result.userType === UserType.WORKER) {
        const { updateFastResponderScore } = await import("../../services/fastResponder.service");
        await updateFastResponderScore(result._id);
      }
      
      await result.save();

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
        // Sort: Early Access Badge first, then Premium users, then by profile completion
        {
          $sort: {
            hasEarlyAccessBadge: -1, // Early access badge holders first
            hasPremiumPlan: -1,       // Then premium users
            profileCompletion: -1,    // Then by profile completion
            createdAt: -1,            // Then by newest
          }
        }
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

  static async generateOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { mobile, email, userType } = req.body;

      if (!mobile && !email) {
        return res.status(400).json({
          success: false,
          message: "Mobile number or email is required",
        });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

      // Save or update OTP in DB
      await Otp.findOneAndUpdate(
        mobile ? { mobile } : { email },
        { otp: otpCode, expiresAt, verified: false, mobile, email },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (email) {
        // Send OTP via email
        await sendEmail({
          to: email,
          from: { name: "Worker Sahay" }, // optional, fallback to config.email.from
          subject: "Your OTP Code",
          text: `Your OTP is ${otpCode}`,
        });
        console.log(`OTP sent to email: ${email}`);
      } else if (mobile) {
        // Send OTP via SMS (integrate your SMS provider)
        console.log(`OTP sent to mobile: ${mobile} -> ${otpCode}`);
        // Example: await smsService.sendOtp(mobile, otpCode);
      }

      return res.status(200).json({
        success: true,
        message: "OTP has been sent successfully",
        otp: otpCode, // Remove this in production for security
      });
    } catch (error) {
      next(error);
    }
  }


  // static async generateOtp(
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<any> {
  //   try {
  //     const { mobile, userType } = req.body;

  //     if (!mobile) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Phone number is required",
  //       });
  //     }

  //     const user = await User.findOne({ mobile, userType });
  //     if (!user) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "No user found with this phone number",
  //       });
  //     }

  //     const otpCode =
  //       mobile.toString() === "6397228522"
  //         ? "123456"
  //         : Math.floor(100000 + Math.random() * 900000).toString();
  //     const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

  //     // Save or update OTP
  //     await Otp.findOneAndUpdate(
  //       { mobile },
  //       {
  //         expiresAt,
  //         mobile,
  //         otp: otpCode,
  //         verified: false,
  //       },
  //       { upsert: true, new: true, setDefaultsOnInsert: true }
  //     );

  //     // TODO: Integrate real SMS service like Twilio or Fast2SMS
  //     console.log(`OTP sent to ${mobile}: ${otpCode}`);

  //     return res.status(200).json({
  //       otp: otpCode,
  //       success: true,
  //       message: "OTP has been sent successfully",
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  static async generateAdminOtp(
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

      if (user.userType === UserType.WORKER) {
        return res.status(404).json({
          success: false,
          message: "No Account Found",
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
        message: `OTP has been sent successfully! OTP: ${otpCode}`,
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
      const { mobile, email, otp, userType } = req.body;

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

      const user: any = await User.findOne({ mobile, userType });

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



  static async verifyAdminOtp(
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

  static async verifyEmailOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      const otpDoc = await Otp.findOne({ email, otp });

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

      const user: any = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Set email as verified
      if (!user?.isEmailVerified) user.isEmailVerified = true;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
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
      const { id: userId } = (req as any).user;
      const result = await userService.getById(userId);

      enrollmentCourses = await Enrollment.find(
        {
          user: userId,
          status: EnrollmentStatus.ACTIVE || EnrollmentStatus.COMPLETED,
        }
      );

      enrollSubscriptionPlans = await EnrolledPlan.find(
        {
          user: userId,
          status: {
            $in: [PlanEnrollmentStatus.ACTIVE],
          },
        }
      ).populate("plan");

      // Check if user has active plan
      const hasActivePlan = enrollSubscriptionPlans && enrollSubscriptionPlans.length > 0;

      // Get subscription plan type for flags
      let subscriptionPlanType = PlanType.FREE;
      let subscriptionInfo: any = {
        planType: subscriptionPlanType,
      };

      if (hasActivePlan && enrollSubscriptionPlans[0]) {
        subscriptionPlanType = (enrollSubscriptionPlans[0].plan as any).planType;
        subscriptionInfo.planType = subscriptionPlanType;

        const userType = result?.userType;

        // Build subscription flags based on user type and plan type
        if (userType === "worker") {
          // Worker plan flags: FREE, BASIC, PREMIUM
          subscriptionInfo.isBasicPlan = subscriptionPlanType === PlanType.BASIC;
          subscriptionInfo.isPremiumPlan = subscriptionPlanType === PlanType.PREMIUM;
          subscriptionInfo.hasBasicOrPremium = subscriptionPlanType === PlanType.BASIC || subscriptionPlanType === PlanType.PREMIUM;
        } else if (userType === "employer" || userType === "contractor") {
          // Employer/Contractor plan flags: FREE, BASIC, GROWTH, ENTERPRISE
          subscriptionInfo.isBasicPlan = subscriptionPlanType === PlanType.BASIC;
          subscriptionInfo.isGrowthPlan = subscriptionPlanType === PlanType.GROWTH;
          subscriptionInfo.isEnterprisePlan = subscriptionPlanType === PlanType.ENTERPRISE;
          
          // Convenience flags for checking tier thresholds
          subscriptionInfo.hasBasicOrAbove = 
            subscriptionPlanType === PlanType.BASIC || 
            subscriptionPlanType === PlanType.GROWTH || 
            subscriptionPlanType === PlanType.ENTERPRISE;
          
          subscriptionInfo.hasGrowthOrAbove = 
            subscriptionPlanType === PlanType.GROWTH || 
            subscriptionPlanType === PlanType.ENTERPRISE;
          
          subscriptionInfo.hasEnterprise = subscriptionPlanType === PlanType.ENTERPRISE;
        }
      } else {
        // Free plan flags for all user types
        if (result?.userType === "worker") {
          subscriptionInfo.isBasicPlan = false;
          subscriptionInfo.isPremiumPlan = false;
          subscriptionInfo.hasBasicOrPremium = false;
        } else if (result?.userType === "employer" || result?.userType === "contractor") {
          subscriptionInfo.isBasicPlan = false;
          subscriptionInfo.isGrowthPlan = false;
          subscriptionInfo.isEnterprisePlan = false;
          subscriptionInfo.hasBasicOrAbove = false;
          subscriptionInfo.hasGrowthOrAbove = false;
          subscriptionInfo.hasEnterprise = false;
        }
      }

      // Fetch documents from FileUpload model
      const documents = await FileUpload.find(
        { userId },
        { url: 1, tag: 1, originalName: 1, uploadedAt: 1, _id: 1 }
      ).sort({ uploadedAt: -1 }).lean();

      // Fetch profilePic from FileUpload model
      const profilePic = await FileUpload.findOne({
        userId,
        tag: "profilePic",
      }).sort({ createdAt: -1 });

      // Add profilePicUrl to user object
      const userWithProfilePic = {
        ...result?.toObject(),
        profilePicUrl: profilePic?.url || null,
      };

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            {
              user: userWithProfilePic,
              enrollmentCourses,
              enrollSubscriptionPlans,
              documents,
              hasActivePlan,
              subscriptionInfo,
            },
            `User fetched successfully`
          )
        );
    } catch (error) {
      next(error); // Pass errors to the error handling middleware
    }
  }

  static async getUserFilters(req: Request, res: Response) {
    try {
      const [
        skills,
        yearsOfExperience,
        educationFields,
        educationDegrees,
        educationInstitutions,
        experienceCompanies,
        experiencePositions,
        cities,
        states,
        pincodes,
        availabilityStatus,
        preferredWorkType,
      ] = await Promise.all([
        User.distinct("profile.skills.name"),
        User.distinct("profile.skills.yearsOfExperience"),
        User.distinct("profile.education.field"),
        User.distinct("profile.education.degree"),
        User.distinct("profile.education.institution"),
        User.distinct("profile.experience.company"),
        User.distinct("profile.experience.position"),
        User.distinct("primaryLocation.city"),
        User.distinct("primaryLocation.state"),
        User.distinct("primaryLocation.pincode"),
        User.distinct("primaryLocation.availability.status"),
        User.distinct("primaryLocation.availability.preferredWorkType")
      ]);
      const [
        preferredLocations,
        salaryExpectation,
        frequency,
        jobType,
        workModes,
        experienceLevel
      ] = await Promise.all([
        UserPreference.distinct("preferredLocations"),
        UserPreference.distinct("salaryExpectation.amount"),
        UserPreference.distinct("salaryExpectation.frequency"),
        UserPreference.distinct("jobType"),
        UserPreference.distinct("workModes"),
        UserPreference.distinct("experienceLevel"),
      ]);

      return res.status(200).json({
        success: true,
        filters: {
          skills: {
            skills: skills.filter(Boolean),
            yearsOfExperience: yearsOfExperience.filter(Boolean),
          },
          education: {
            fields: educationFields.filter(Boolean),
            degrees: educationDegrees.filter(Boolean),
            institutions: educationInstitutions.filter(Boolean),
          },
          experience: {
            companies: experienceCompanies.filter(Boolean),
            positions: experiencePositions.filter(Boolean),
          },
          locations: {
            states: states.filter(Boolean),
            cities: cities.filter(Boolean),
            pincodes: pincodes.filter(Boolean),
            preferredLocations: preferredLocations.filter(Boolean),
          },
          availability: {
            status: availabilityStatus.filter(Boolean),
            preferredWorkType: preferredWorkType.filter(Boolean)
          },
          employmentPreferences: {
            jobType: jobType.filter(Boolean),
            frequency: frequency.filter(Boolean),
            workModes: workModes.filter(Boolean),
            experienceLevel: experienceLevel.filter(Boolean),
            salaryExpectation: salaryExpectation.filter(Boolean),
          }
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching filters",
        error,
      });
    }
  }

  // Admin: Grant Early Access Badge
  static async grantEarlyAccessBadge(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { userId } = req.params;
      const { duration } = req.body; // Optional: duration in days (0 = permanent)

      if (!userId) {
        return res.status(400).json(
          new ApiError(400, "User ID is required")
        );
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json(
          new ApiError(404, "User not found")
        );
      }

      // Only allow for EMPLOYER, CONTRACTOR, or AGENT
      if (![UserType.EMPLOYER, UserType.CONTRACTOR].includes(user.userType as UserType)) {
        return res.status(400).json(
          new ApiError(400, `Early Access Badge is only for Employers and Contractors. User type is: ${user.userType}`)
        );
      }

      user.hasEarlyAccessBadge = true;
      await user.save();

      return res.status(200).json(
        new ApiResponse(
          200,
          user,
          `Early Access Badge granted to ${user.fullName}`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Admin: Revoke Early Access Badge
  static async revokeEarlyAccessBadge(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json(
          new ApiError(400, "User ID is required")
        );
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json(
          new ApiError(404, "User not found")
        );
      }

      user.hasEarlyAccessBadge = false;
      await user.save();

      return res.status(200).json(
        new ApiResponse(
          200,
          user,
          `Early Access Badge revoked from ${user.fullName}`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get users with Early Access Badge
  static async getEarlyAccessBadgeUsers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const users = await User.find({ hasEarlyAccessBadge: true })
        .select("fullName email mobile userType hasPremiumPlan hasEarlyAccessBadge createdAt");

      return res.status(200).json(
        new ApiResponse(
          200,
          users,
          `Found ${users.length} users with Early Access Badge`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  static async getCandidateBrandingStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res
          .status(401)
          .json(new ApiError(401, "Authentication required"));
      }

      // Get user's branding eligibility
      const eligibility = await getCandidateBrandingEligibility(userId);

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            planType: eligibility.planType,
            eligibleBadges: {
              verifiedWorker: eligibility.verifiedWorker,
              policeVerified: eligibility.policeVerified,
              fastResponder: eligibility.fastResponder,
              skilledCandidate: eligibility.skilledCandidate,
              trainedByWorkerSahay: eligibility.trainedByWorkerSahay,
              preInterviewedCandidate: eligibility.preInterviewedCandidate,
              profileFeaturedToEmployers: eligibility.profileFeaturedToEmployers,
            },
            summary: {
              totalEligible: Object.values(eligibility).filter(
                (v) => typeof v === "boolean" && v
              ).length,
              message: this.getBrandingMessage(eligibility.planType),
            },
          },
          "Candidate branding eligibility fetched successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  }

  static getBrandingMessage(planType: string): string {
    switch (planType) {
      case PlanType.FREE:
        return "Upgrade to BASIC to unlock Skilled Candidate badge and more!";
      case PlanType.BASIC:
        return "Upgrade to PREMIUM to unlock exclusive badges and get featured!";
      case PlanType.PREMIUM:
        return "You have access to all premium branding features!";
      default:
        return "Check your plan for available branding features.";
    }
  }
}

