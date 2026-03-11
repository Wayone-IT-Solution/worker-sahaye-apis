import Admin from "../../modals/admin.model";
import { config } from "../../config/config";
import mongoose from "mongoose";
import jwt, { SignOptions } from "jsonwebtoken";
import ApiResponse from "../../utils/ApiResponse";
import ApiError from "../../utils/ApiError";
import { Request, Response, NextFunction } from "express";
import { CommonService } from "../../services/common.services";
import { SequenceCounter } from "../../modals/sequencecounter.model";
import FileUpload, { FileTag } from "../../modals/fileupload.model";
import { User } from "../../modals/user.model";
import {
  EnrolledPlan,
  PlanEnrollmentStatus,
} from "../../modals/enrollplan.model";
import { Enrollment } from "../../modals/enrollment.model";
import { Engagement } from "../../modals/engagement.model";
import { CandidateBrandingBadge } from "../../modals/candidatebrandingbadge.model";
import {
  CommunityMember,
  MemberStatus,
} from "../../modals/communitymember.model";
import { Community } from "../../modals/community.model";
import {
  ConnectionModel,
  ConnectionStatus,
} from "../../modals/connection.model";
import { Booking } from "../../modals/booking.model";
import { GratuityRecord } from "../../modals/gratuityrecord.model";
import LoanSupport from "../../modals/loansupport.model";
import { Quotation, QuotationStatus } from "../../modals/quotation.model";
import { Job } from "../../modals/job.model";
import {
  ApplicationStatus,
  JobApplication,
} from "../../modals/jobapplication.model";
import { BulkHiringRequest } from "../../modals/bulkhiring.model";
import { JobRequirement } from "../../modals/jobrequirement.model";
import { ProjectBasedHiring } from "../../modals/projectbasedhiring.model";
import { VirtualHRRequest } from "../../modals/virtualhrrequest.model";
import { VirtualHrRecruiter } from "../../modals/virtualhrecruiter.model";
import { UnifiedServiceRequest } from "../../modals/unifiedrequest.model";
import { Promotion } from "../../modals/promotion.model";
import { Endorsement } from "../../modals/endorsement.model";

const secret = config.jwt.secret;
const adminService = new CommonService(Admin);
const expiresIn = config.jwt.expiresIn as SignOptions["expiresIn"];

interface AdminCreatePayload {
  role: string;
  email: string;
  status?: boolean | string | number;
  username: string;
  password: string;
  mobile?: string;
  callFields?: string[];
}

/**
 * User Controller
 */
export class AdminController {
  static async getNextEmployeeCode(): Promise<string> {
    const counter = await SequenceCounter.findOneAndUpdate(
      { key: "admin:employee_code" },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    const next = Number(counter?.seq || 0);
    return `EMP${String(next).padStart(3, "0")}`;
  }

  static normalizeStatus(status: unknown): boolean {
    if (typeof status === "boolean") return status;
    if (typeof status === "number") return status === 1;
    if (typeof status === "string") {
      const normalized = status.trim().toLowerCase();
      return (
        normalized === "active" || normalized === "true" || normalized === "1"
      );
    }
    return false;
  }

  static sanitizeAdmin(user: any) {
    const adminData = user?.toObject ? user.toObject() : user;
    if (adminData?.password) delete adminData.password;
    return adminData;
  }

  /**
   * Create a new user
   */
  static async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      if (Array.isArray(req.body)) {
        if (req.body.length === 0) {
          return res.status(400).json({
            success: false,
            message: "No user records found in request body",
          });
        }

        const users = [];
        for (let index = 0; index < req.body.length; index += 1) {
          const row = req.body[index] as AdminCreatePayload;
          const { username, email, password, role, status, callFields } = row;

          if (!username || !email || !password || !role) {
            return res.status(400).json({
              success: false,
              message: `Missing required fields at row ${index + 1}`,
            });
          }

          const user = await AdminController.createUser({
            role,
            email,
            password,
            username,
            mobile: row.mobile,
            status: AdminController.normalizeStatus(status),
            callFields,
          });

          users.push(AdminController.sanitizeAdmin(user));
        }

        return res.status(201).json({
          success: true,
          users,
          message: `${users.length} users created successfully`,
        });
      }

      const { username, email, password, role, status, callFields } =
        req.body as AdminCreatePayload;
      const user = await AdminController.createUser({
        role,
        email,
        password,
        username,
        mobile: req.body.mobile,
        status: AdminController.normalizeStatus(status),
        callFields,
      });

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        user: AdminController.sanitizeAdmin(user),
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdminById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const { id } = req.params;
      let admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }
      admin = JSON.parse(JSON.stringify(admin));

      res.status(200).json({
        success: true,
        data: { ...admin, password: "" },
        message: "Admin retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const { id } = req.params;
      const { username, role, status, callFields } = req.body;
      const updatedUser = await Admin.findByIdAndUpdate(
        id,
        {
          username,
          role,
          mobile: req.body.mobile,
          status: AdminController.normalizeStatus(status),
          callFields,
        },
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const { id } = req.params;
      const deletedUser = await Admin.findByIdAndDelete(id);

      if (!deletedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
        user: deletedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllAdmins(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "roles",
            localField: "role",
            foreignField: "_id",
            as: "roleDetails",
          },
        },
        {
          $unwind: {
            path: "$roleDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            role: "$roleDetails.name",
          },
        },
        {
          $project: {
            password: 0,
            roleDetails: 0,
          },
        },
      ];

      const result = await adminService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async loginAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const data = await AdminController.loginUser({ email, password });

      // Send response with the token
      res.status(200).json({
        success: true,
        message: "Login successful",
        token: data.token, // Send the token in response
        user: {
          _id: data?.user?.id,
          role: data?.user?.role,
          email: data?.user?.email,
          username: data?.user?.username,
          permissions: data?.user?.permissions,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get the current user details based on the provided JWT token
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @param {NextFunction} next - The next middleware function
   */
  static async getCurrentAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = (req as any).user.id; // Extracted from the decoded JWT token
      const user: any = await AdminController.getUserById(userId);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return; // Returning to prevent further execution
      }

      res.status(200).json({
        success: true,
        message: "User details fetched successfully",
        user: {
          _id: user._id,
          email: user.email,
          role: user?.role?.name,
          username: user?.username,
          permissions: user?.role?.permissions,
        },
      });
    } catch (error) {
      next(error); // Pass errors to the error handling middleware
    }
  }
  /**
   * Get user details by user ID
   */
  static async getUserById(userId: string) {
    const user = await Admin.findById({ _id: userId, status: true }).populate({
      path: "role",
      select: "name permissions",
    });
    return user;
  }

  /**
   * Reset password for an admin user
   */
  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password is required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      const admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Update password (it will be hashed by the pre-save hook)
      admin.password = newPassword;
      await admin.save();

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserEngagementDetails(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const userId = req.params.userId;
      const limit = Math.min(
        Math.max(parseInt(req.query.limit as string, 10) || 20, 1),
        100,
      );
      const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
      const skip = (page - 1) * limit;
      const engagementType = (req.query.engagementType as string) || undefined;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json(new ApiError(400, "Invalid user id"));
      }
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const user = await User.findById(userId).lean();
      if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }

      const [
        profilePic,
        activePlanEnrollment,
        enrollments,
        enrolledPlans,
        sentEngagements,
        receivedEngagements,
        sentEndorsements,
        receivedEndorsements,
        sentEndorsementRequests,
        receivedEndorsementRequests,
      ] = await Promise.all([
        FileUpload.findOne({
          userId: userObjectId,
          tag: FileTag.PROFILE_PICTURE,
        })
          .sort({ createdAt: -1 })
          .lean(),
        EnrolledPlan.findOne({
          user: userObjectId,
          status: PlanEnrollmentStatus.ACTIVE,
        })
          .sort({ enrolledAt: -1 })
          .populate("plan")
          .lean(),
        Enrollment.find({ user: userObjectId })
          .sort({ createdAt: -1 })
          .limit(30)
          .lean(),
        EnrolledPlan.find({ user: userObjectId })
          .sort({ createdAt: -1 })
          .limit(30)
          .populate("plan")
          .lean(),
        Engagement.find({
          initiator: userObjectId,
          ...(engagementType ? { engagementType } : {}),
        })
          .populate("recipient", "fullName userType")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Engagement.find({
          recipient: userObjectId,
          ...(engagementType ? { engagementType } : {}),
        })
          .populate("initiator", "fullName userType")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Endorsement.find({
          endorsedBy: userObjectId,
          isRequest: false,
          fulfilled: true,
        })
          .populate("endorsedTo", "fullName userType email mobile")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        Endorsement.find({
          endorsedTo: userObjectId,
          isRequest: false,
          fulfilled: true,
        })
          .populate("endorsedBy", "fullName userType email mobile")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        Endorsement.find({
          endorsedTo: userObjectId,
          isRequest: true,
          fulfilled: false,
        })
          .populate("endorsedBy", "fullName userType email mobile")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        Endorsement.find({
          endorsedBy: userObjectId,
          isRequest: true,
          fulfilled: false,
        })
          .populate("endorsedTo", "fullName userType email mobile")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
      ]);

      const [totalSent, totalReceived, engagementTypeAgg] = await Promise.all([
        Engagement.countDocuments({ initiator: userObjectId }),
        Engagement.countDocuments({ recipient: userObjectId }),
        Engagement.aggregate([
          { $match: { initiator: userObjectId } },
          { $group: { _id: "$engagementType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ]),
      ]);

      const averageReceivedEndorsementRating = receivedEndorsements.length
        ? Number(
            (
              receivedEndorsements.reduce(
                (sum: number, item: any) =>
                  sum + Number(item?.overallPerformance || 0),
                0,
              ) / receivedEndorsements.length
            ).toFixed(2),
          )
        : 0;

      const enrollmentRevenue = enrollments.reduce(
        (sum: number, item: any) => sum + Number(item?.finalAmount || 0),
        0,
      );
      const planRevenue = enrolledPlans.reduce(
        (sum: number, item: any) => sum + Number(item?.finalAmount || 0),
        0,
      );

      const payload: any = {
        user: {
          ...user,
          profilePic: profilePic?.url || null,
        },
        profile: {
          base: user,
          profilePic: profilePic?.url || null,
        },
        subscription: activePlanEnrollment
          ? {
              enrollmentId: activePlanEnrollment._id,
              enrolledAt: activePlanEnrollment.enrolledAt,
              expiredAt: activePlanEnrollment.expiredAt,
              status: activePlanEnrollment.status,
              paymentDetails: activePlanEnrollment.paymentDetails,
              plan: activePlanEnrollment.plan,
            }
          : null,
        transactions: {
          enrollments,
          plans: enrolledPlans,
          revenue: {
            courseRevenue: enrollmentRevenue,
            planRevenue,
            totalRevenue: enrollmentRevenue + planRevenue,
          },
        },
        engagement: {
          sent: sentEngagements,
          received: receivedEngagements,
          endorsement: {
            sent: sentEndorsements,
            received: receivedEndorsements,
            requestsSent: sentEndorsementRequests,
            requestsReceived: receivedEndorsementRequests,
            statistics: {
              sent: sentEndorsements.length,
              received: receivedEndorsements.length,
              pendingSentRequests: sentEndorsementRequests.length,
              pendingReceivedRequests: receivedEndorsementRequests.length,
              averageReceivedRating: averageReceivedEndorsementRating,
            },
          },
          statistics: {
            totalSent,
            totalReceived,
            mostUsedEngagementType: engagementTypeAgg?.[0]?._id || "",
          },
        },
      };

      if (user.userType === "worker") {
        const [
          badges,
          cvFiles,
          communities,
          acceptedConnectionsCount,
          personalAssistantBookings,
          gratuityRecords,
          loanSupportRequests,
        ] = await Promise.all([
          CandidateBrandingBadge.find({ user: userObjectId })
            .sort({ assignedAt: -1 })
            .lean(),
          FileUpload.find({
            userId: userObjectId,
            tag: {
              $in: [
                FileTag.RESUME,
                FileTag.PERSONALRESUME,
                FileTag.AUTO_GENERATED_CV,
              ],
            },
          })
            .sort({ createdAt: -1 })
            .lean(),
          CommunityMember.aggregate([
            {
              $match: {
                user: userObjectId,
                status: MemberStatus.JOINED,
              },
            },
            {
              $lookup: {
                from: "communities",
                localField: "community",
                foreignField: "_id",
                as: "community",
              },
            },
            { $unwind: "$community" },
            {
              $project: {
                _id: 1,
                joinedAt: 1,
                communityId: "$community._id",
                communityName: "$community.name",
                communityType: "$community.type",
                communityPrivacy: "$community.privacy",
                totalMembers: "$community.stats.totalMembers",
                totalPosts: "$community.stats.totalPosts",
              },
            },
            { $sort: { joinedAt: -1 } },
          ]),
          ConnectionModel.countDocuments({
            status: ConnectionStatus.ACCEPTED,
            $or: [{ requester: userObjectId }, { recipient: userObjectId }],
          }),
          Booking.find({ user: userObjectId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
          GratuityRecord.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
          LoanSupport.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
        ]);

        payload.worker = {
          badges,
          cvs: cvFiles,
          communities,
          connections: {
            acceptedCount: acceptedConnectionsCount,
          },
          personalAssistantBookings,
          gratuityRecords,
          loanSupportRequests,
        };
      }

      if (user.userType === "contractor" || user.userType === "employer") {
        const [
          quotations,
          bulkHiringRequests,
          jobRequirements,
          projectBasedRequests,
          virtualHrRequests,
          virtualHrRecruiterRequests,
          unifiedServiceRequests,
          promotionalRequests,
        ] = await Promise.all([
          Quotation.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean(),
          BulkHiringRequest.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean(),
          JobRequirement.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean(),
          ProjectBasedHiring.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean(),
          VirtualHRRequest.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean(),
          VirtualHrRecruiter.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean(),
          UnifiedServiceRequest.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean(),
          Promotion.find({ userId }).sort({ createdAt: -1 }).limit(100).lean(),
        ]);

        const quotationStats = {
          total: quotations.length,
          received: quotations.length,
          sent: quotations.length,
          approved: quotations.filter(
            (q: any) => q.status === QuotationStatus.APPROVED,
          ).length,
          replied: quotations.filter(
            (q: any) => q.status !== QuotationStatus.UNDER_REVIEW,
          ).length,
          completed: quotations.filter(
            (q: any) => q.status === QuotationStatus.COMPLETED,
          ).length,
          rejected: quotations.filter(
            (q: any) => q.status === QuotationStatus.REJECTED,
          ).length,
        };

        const baseJobs = await Job.find({ postedBy: userObjectId })
          .sort({ createdAt: -1 })
          .limit(200)
          .lean();
        const jobs =
          user.userType === "contractor"
            ? baseJobs.filter((j: any) => j.userType === "worker")
            : baseJobs;
        const jobIds = jobs.map((j: any) => j._id);

        const applicationsRaw = await JobApplication.find({
          job: { $in: jobIds },
        })
          .populate("applicant", "fullName userType email mobile")
          .populate("job", "title userType postedBy")
          .sort({ createdAt: -1 })
          .lean();

        const applications =
          user.userType === "contractor"
            ? applicationsRaw.filter(
                (a: any) => (a as any)?.applicant?.userType === "worker",
              )
            : applicationsRaw;

        const applicationsByStatus = applications.reduce(
          (acc: any, app: any) => {
            const status = app?.status || "unknown";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          },
          {},
        );

        const listingWiseStatsMap: Record<string, any> = {};
        jobs.forEach((job: any) => {
          const jobId = String(job?._id || "");
          if (!jobId) return;
          listingWiseStatsMap[jobId] = {
            jobId,
            title: job?.title || "Untitled Job",
            jobStatus: job?.status || "unknown",
            targetUserType: job?.userType || "",
            applications: 0,
            hired: 0,
            offerAccepted: 0,
            shortlisted: 0,
            rejected: 0,
            underReview: 0,
            interview: 0,
            offered: 0,
            withdrawn: 0,
          };
        });

        const jobWiseMap: Record<string, any> = {};
        applications.forEach((app: any) => {
          const jobId = String(app?.job?._id || app?.job || "");
          if (!jobId) return;

          if (!listingWiseStatsMap[jobId]) {
            listingWiseStatsMap[jobId] = {
              jobId,
              title: app?.job?.title || "Untitled Job",
              jobStatus: "unknown",
              targetUserType: app?.job?.userType || "",
              applications: 0,
              hired: 0,
              offerAccepted: 0,
              shortlisted: 0,
              rejected: 0,
              underReview: 0,
              interview: 0,
              offered: 0,
              withdrawn: 0,
            };
          }
          listingWiseStatsMap[jobId].applications += 1;

          if (!jobWiseMap[jobId]) {
            jobWiseMap[jobId] = {
              jobId,
              title: app?.job?.title || "Untitled Job",
              targetUserType: app?.job?.userType || "",
              total: 0,
              hired: 0,
              shortlisted: 0,
              rejected: 0,
              applied: 0,
            };
          }
          jobWiseMap[jobId].total += 1;
          const s = app?.status;
          if (s === ApplicationStatus.HIRED) jobWiseMap[jobId].hired += 1;
          if (s === ApplicationStatus.SHORTLISTED)
            jobWiseMap[jobId].shortlisted += 1;
          if (s === ApplicationStatus.REJECTED) jobWiseMap[jobId].rejected += 1;
          if (s === ApplicationStatus.APPLIED) jobWiseMap[jobId].applied += 1;

          if (s === ApplicationStatus.HIRED)
            listingWiseStatsMap[jobId].hired += 1;
          if (s === ApplicationStatus.OFFERACCEPTED)
            listingWiseStatsMap[jobId].offerAccepted += 1;
          if (s === ApplicationStatus.SHORTLISTED)
            listingWiseStatsMap[jobId].shortlisted += 1;
          if (s === ApplicationStatus.REJECTED)
            listingWiseStatsMap[jobId].rejected += 1;
          if (s === ApplicationStatus.UNDER_REVIEW)
            listingWiseStatsMap[jobId].underReview += 1;
          if (s === ApplicationStatus.INTERVIEW)
            listingWiseStatsMap[jobId].interview += 1;
          if (s === ApplicationStatus.OFFERED)
            listingWiseStatsMap[jobId].offered += 1;
          if (s === ApplicationStatus.WITHDRAWN)
            listingWiseStatsMap[jobId].withdrawn += 1;
        });

        const hiredApplications = applications.filter(
          (app: any) =>
            app?.status === ApplicationStatus.HIRED ||
            app?.status === ApplicationStatus.OFFERACCEPTED,
        );

        const jobListingsByTarget = jobs.reduce((acc: any, job: any) => {
          const t = job?.userType || "unknown";
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {});

        payload.business = {
          quotations: {
            stats: quotationStats,
            list: quotations,
          },
          requests: {
            bulkHiring: bulkHiringRequests,
            jobRequirements,
            projectBased: projectBasedRequests,
            virtualHr: virtualHrRequests,
            virtualHrRecruiter: virtualHrRecruiterRequests,
            unifiedService: unifiedServiceRequests,
            promotion: promotionalRequests,
          },
          jobs: {
            total: jobs.length,
            byTargetUserType: jobListingsByTarget,
            list: jobs,
            listingWiseStats: Object.values(listingWiseStatsMap),
          },
          applications: {
            total: applications.length,
            byStatus: applicationsByStatus,
            jobWise: Object.values(jobWiseMap),
            hired: hiredApplications,
            list: applications.slice(0, 150),
          },
        };
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            payload,
            "User engagement details fetched successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new user
   */
  static async createUser(userData: {
    role: string;
    email: string;
    status: boolean;
    username: string;
    password: string;
    mobile?: string;
    callFields?: string[];
  }) {
    const { username, email, password, role, status, mobile, callFields } =
      userData;

    const existingUser = await Admin.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser)
      throw new Error("User with this email or username already exists");

    const employeeCode = await AdminController.getNextEmployeeCode();

    const user = new Admin({
      role,
      email,
      status,
      password,
      username,
      employeeCode,
      mobile,
      callFields: callFields || [],
    });
    return await user.save();
  }

  /**
   * Login a user
   */
  static async loginUser(loginData: { email: string; password: string }) {
    const { email, password } = loginData;

    const user: any = await Admin.findOne({ email }).populate({
      path: "role",
      select: "name permissions",
    });
    if (!user) throw new ApiError(404, "User not found with this email");
    if (user.status === false) {
      throw new ApiError(
        403,
        "Your account is inactive. Please contact support.",
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new ApiError(401, "Password is incorrect");

    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user?.role?.name },
      secret,
      { expiresIn },
    );

    return {
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user?.role?.name,
        username: user.username,
        permissions: user?.role?.permissions,
      },
    };
  }
}
