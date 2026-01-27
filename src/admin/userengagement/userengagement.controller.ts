import { Request, Response, NextFunction } from "express";
import { User } from "../../modals/user.model";
import { Engagement } from "../../modals/engagement.model";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import ApiResponse from "../../utils/ApiResponse";
import ApiError from "../../utils/ApiError";
import FileUpload, { FileTag } from "../../modals/fileupload.model";

export class UserEngagementController {
    /**
     * Get comprehensive engagement details for a specific user
     * Includes: user info, subscription plan, engagement limits, usage stats, sent/received engagements
     */
    static async getUserEngagementDetails(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10, engagementType } = req.query;

            // Fetch user details
            const user = await User.findById(userId)
                .select("-password")
                .lean();

            if (!user) {
                return res.status(404).json(new ApiError(404, "User not found"));
            }

            // Fetch current active subscription plan
            const enrolledPlan = await EnrolledPlan.findOne({
                user: userId,
                status: "active",
            })
                .populate("plan")
                .sort({ enrolledAt: -1 })
                .lean();

            // Fetch user profile picture
            const profilePicDoc = await FileUpload.findOne({
                userId: user._id,
                tag: FileTag.PROFILE_PICTURE
            })
                .sort({ createdAt: -1 })
                .lean();

            const profilePic = profilePicDoc ? profilePicDoc.url : null;

            let subscriptionPlanDetails = null;
            let engagementLimits = null;

            if (enrolledPlan && enrolledPlan.plan) {
                const plan = enrolledPlan.plan as any;
                subscriptionPlanDetails = {
                    planName: plan.name,
                    displayName: plan.displayName,
                    planType: plan.planType,
                    billingCycle: plan.billingCycle,
                    basePrice: plan.basePrice,
                    currency: plan.currency,
                    status: plan.status,
                    enrolledAt: enrolledPlan.enrolledAt,
                    expiresAt: enrolledPlan.expiredAt,
                    features: plan.features,
                };

                const getLimit = (limitField: any, role: string) => {
                    if (typeof limitField === 'number') return limitField;
                    if (typeof limitField === 'object' && limitField !== null) return limitField[role] || null;
                    return null;
                };

                // Extract engagement limits from the plan
                engagementLimits = {
                    worker: {
                        invite: getLimit(plan.inviteSendLimit, 'worker'),
                        viewProfile: getLimit(plan.viewProfileLimit, 'worker'),
                        contactUnlock: getLimit(plan.contactUnlockLimit, 'worker'),
                        saveProfile: getLimit(plan.saveProfileLimit, 'worker'),
                    },
                    employer: {
                        invite: getLimit(plan.inviteSendLimit, 'employer'),
                        viewProfile: getLimit(plan.viewProfileLimit, 'employer'),
                        contactUnlock: getLimit(plan.contactUnlockLimit, 'employer'),
                        saveProfile: getLimit(plan.saveProfileLimit, 'employer'),
                    },
                    contractor: {
                        invite: getLimit(plan.inviteSendLimit, 'contractor'),
                        viewProfile: getLimit(plan.viewProfileLimit, 'contractor'),
                        contactUnlock: getLimit(plan.contactUnlockLimit, 'contractor'),
                        saveProfile: getLimit(plan.saveProfileLimit, 'contractor'),
                    },
                };
            }

            // Calculate engagement usage statistics
            const engagementStats = await Engagement.aggregate([
                {
                    $match: { initiator: user._id },
                },
                {
                    $group: {
                        _id: {
                            engagementType: "$engagementType",
                            recipientType: "$recipientType",
                        },
                        count: { $sum: 1 },
                    },
                },
            ]);

            // Format usage stats
            const usageStats: Record<string, Record<string, number>> = {
                worker: {
                    invite: 0,
                    viewProfile: 0,
                    contactUnlock: 0,
                    saveProfile: 0,
                },
                employer: {
                    invite: 0,
                    viewProfile: 0,
                    contactUnlock: 0,
                    saveProfile: 0,
                },
                contractor: {
                    invite: 0,
                    viewProfile: 0,
                    contactUnlock: 0,
                    saveProfile: 0,
                },
            };

            engagementStats.forEach((stat: { _id: { recipientType: string; engagementType: string }; count: number }) => {
                const { recipientType, engagementType } = stat._id;
                if (usageStats[recipientType] && usageStats[recipientType][engagementType] !== undefined) {
                    usageStats[recipientType][engagementType] = stat.count;
                }
            });

            // Fetch sent engagements with pagination
            const sentQuery: any = { initiator: userId };
            if (engagementType) {
                sentQuery.engagementType = engagementType;
            }

            const sentEngagements = await Engagement.find(sentQuery)
                .populate("recipient", "fullName userType email profilePic")
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip((Number(page) - 1) * Number(limit))
                .lean();

            const totalSent = await Engagement.countDocuments(sentQuery);

            // Fetch received engagements with pagination
            const receivedQuery: any = { recipient: userId };
            if (engagementType) {
                receivedQuery.engagementType = engagementType;
            }

            const receivedEngagements = await Engagement.find(receivedQuery)
                .populate("initiator", "fullName userType email profilePic")
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip((Number(page) - 1) * Number(limit))
                .lean();

            const totalReceived = await Engagement.countDocuments(receivedQuery);

            // Calculate overall statistics
            const totalSentAll = await Engagement.countDocuments({ initiator: userId });
            const totalReceivedAll = await Engagement.countDocuments({ recipient: userId });

            // Find most used engagement type
            const mostUsedType = engagementStats.reduce(
                (max, stat) => {
                    const total = stat.count;
                    return total > max.count ? { type: stat._id.engagementType, count: total } : max;
                },
                { type: "none", count: 0 }
            );

            const responseData = {
                user: {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    mobile: user.mobile,
                    userType: user.userType,
                    status: user.status,
                    profilePic,
                    primaryLocation: user.primaryLocation,
                    createdAt: user.createdAt,
                },
                subscriptionPlan: subscriptionPlanDetails,
                engagementLimits,
                usageStats,
                sentEngagements: {
                    data: sentEngagements,
                    pagination: {
                        total: totalSent,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(totalSent / Number(limit)),
                    },
                },
                receivedEngagements: {
                    data: receivedEngagements,
                    pagination: {
                        total: totalReceived,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(totalReceived / Number(limit)),
                    },
                },
                statistics: {
                    totalSent: totalSentAll,
                    totalReceived: totalReceivedAll,
                    mostUsedEngagementType: mostUsedType.type,
                },
            };

            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        responseData,
                        "User engagement details fetched successfully"
                    )
                );
        } catch (err) {
            next(err);
        }
    }
}
