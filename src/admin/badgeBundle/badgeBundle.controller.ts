import { Request, Response } from "express";
import { BadgeBundle } from "../../modals/badgeBundle.model";
import { CommonService } from "../../services/common.services";
import ApiError from "../../utils/ApiError";
import { Types } from "mongoose";
import { User } from "../../modals/user.model";
import ApiResponse from "../../utils/ApiResponse";
import { CandidateBrandingBadge } from "../../modals/candidatebrandingbadge.model";

// Initialize service
const badgeBundleService = new CommonService(BadgeBundle);

export class BadgeBundleController {
    // Create a new bundle
    static async create(req: Request, res: Response) {
        try {
            const bundleData = req.body;

            // Auto-assign order if not provided (append to end)
            if (bundleData.order === undefined || bundleData.order === null) {
                const last = await BadgeBundle.findOne().sort({ order: -1 }).select("order").lean();
                bundleData.order = last && typeof last.order === "number" ? last.order + 1 : 1;
            }

            const bundle = await badgeBundleService.create(bundleData);
            return res.status(201).json({ success: true, data: bundle });
        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // Get a single bundle by ID
    static async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const bundle = await badgeBundleService.getAll(
                { _id: id, pagination: "false" },
                [
                    {
                        $lookup: {
                            from: "badges",
                            localField: "badges",
                            foreignField: "_id",
                            as: "badges",
                        },
                    },
                ]
            );
            return res.status(200).json({ success: true, data: Array.isArray(bundle) ? bundle[0] : null });
        } catch (error: any) {
            return res.status(404).json({ success: false, message: error.message });
        }
    }

    // Get all bundles (with optional filters & pagination)
    static async getAll(req: Request, res: Response) {
        try {
            const query: any = { ...req.query };

            // Default sorting: by `order` ascending unless client provided a sort
            if (!query.multiSort && !query.sortKey) {
                query.sortKey = "order";
                query.sortDir = "asc";
            }

            const bundles = await badgeBundleService.getAll(query, [
                {
                    $lookup: {
                        from: "badges",
                        localField: "badges",
                        foreignField: "_id",
                        as: "badges",
                    },
                },
            ]);
            return res.status(200).json({ success: true, ...bundles });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // Get bundles ordered by `order` (optionally limit via ?limit=number)
    static async getOrdered(req: Request, res: Response) {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : 0;

            // If limit is provided and > 0, use a direct find + populate for better performance
            if (limit && limit > 0) {
                const bundles = await BadgeBundle.find()
                    .sort({ order: 1 })
                    .limit(limit)
                    .populate("badges")
                    .lean();
                return res.status(200).json({ success: true, data: bundles });
            }

            // Otherwise use the common service aggregation to return all bundles sorted by order asc
            const bundles = await badgeBundleService.getAll(
                { pagination: "false", sortKey: "order", sortDir: "asc" },
                [
                    {
                        $lookup: {
                            from: "badges",
                            localField: "badges",
                            foreignField: "_id",
                            as: "badges",
                        },
                    },
                ]
            );

            // When pagination is disabled, service returns an array of documents
            return res.status(200).json({ success: true, data: Array.isArray(bundles) ? bundles : bundles });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // Update a bundle by ID
    static async updateById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const updatedBundle = await badgeBundleService.updateById(id, updateData);
            return res.status(200).json({ success: true, data: updatedBundle });
        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // Bulk update orders (reorder bundles)
    static async updateOrder(req: Request, res: Response) {
        try {
            const items: Array<{ id: string; order: number }> = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, message: "Invalid payload. Expecting non-empty array of { id, order }" });
            }

            const bulkOps = items.map((it) => {
                if (!it.id || typeof it.order !== "number") {
                    throw new Error("Each item must have an 'id' and numeric 'order'");
                }

                if (!Types.ObjectId.isValid(it.id)) {
                    throw new Error(`Invalid id: ${it.id}`);
                }

                return {
                    updateOne: {
                        filter: { _id: new Types.ObjectId(it.id) },
                        update: { $set: { order: it.order } },
                    },
                };
            });

            const result = await BadgeBundle.bulkWrite(bulkOps as any);
            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // Delete a bundle by ID
    static async deleteById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const deletedBundle = await badgeBundleService.deleteById(id);
            return res.status(200).json({ success: true, data: deletedBundle });
        } catch (error: any) {
            return res.status(404).json({ success: false, message: error.message });
        }
    }

    // Get bundles eligible for the given user
    static async getEligibleBundlesByUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            if (!Types.ObjectId.isValid(userId)) {
                return res.status(400).json(new ApiError(400, "Invalid user id"));
            }

            const user = await User.findById(userId).select("_id userType").lean();
            if (!user) {
                return res.status(404).json(new ApiError(404, "User not found"));
            }

            const bundles = await BadgeBundle.find({
                isActive: true,
                userTypes: user.userType,
            })
                .sort({ order: 1, createdAt: -1 })
                .populate("badges", "name slug userTypes isActive")
                .lean();

            return res
                .status(200)
                .json(new ApiResponse(200, bundles, "Eligible bundles fetched successfully"));
        } catch (error: any) {
            return res.status(500).json(new ApiError(500, error.message || "Failed to fetch bundles"));
        }
    }

    // Assign a bundle badge set to a user with strict userType checks
    static async assignBundleToUser(req: Request, res: Response) {
        try {
            const { userId, bundleId } = req.body || {};
            if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(bundleId)) {
                return res.status(400).json(new ApiError(400, "Invalid userId or bundleId"));
            }

            const [user, bundle] = await Promise.all([
                User.findById(userId).select("_id userType fullName").lean(),
                BadgeBundle.findById(bundleId).populate("badges").lean(),
            ]);

            if (!user) return res.status(404).json(new ApiError(404, "User not found"));
            if (!bundle) return res.status(404).json(new ApiError(404, "Bundle badge not found"));
            if (!bundle.isActive) {
                return res.status(400).json(new ApiError(400, "Bundle badge is inactive"));
            }
            if (!Array.isArray(bundle.userTypes) || !bundle.userTypes.includes(user.userType as any)) {
                return res
                    .status(400)
                    .json(new ApiError(400, `This bundle is not allowed for userType ${user.userType}`));
            }

            const badges = Array.isArray(bundle.badges) ? bundle.badges : [];
            if (!badges.length) {
                return res.status(400).json(new ApiError(400, "No badges found in this bundle"));
            }

            const assignableBadges = badges.filter((badge: any) => {
                const badgeUserTypes = Array.isArray(badge?.userTypes) ? badge.userTypes : [];
                const isAllowedForUserType = badgeUserTypes.includes(user.userType);
                return badge?.isActive && isAllowedForUserType;
            });

            if (!assignableBadges.length) {
                return res
                    .status(400)
                    .json(new ApiError(400, "No eligible active badges found in this bundle for the user type"));
            }

            const assigned: any[] = [];
            for (const badgeRaw of assignableBadges) {
                const badge: any = badgeRaw as any;
                const existing = await CandidateBrandingBadge.findOne({
                    user: user._id,
                    badge: badge.name,
                });

                if (existing) {
                    existing.status = "active";
                    existing.earnedBy = "manual";
                    existing.assignedAt = new Date();
                    existing.metaData = {
                        ...(existing.metaData || {}),
                        bundleId: bundle._id,
                        bundleName: bundle.name,
                        assignedVia: "bundle",
                    };
                    await existing.save();
                    assigned.push(existing);
                } else {
                    const created = await CandidateBrandingBadge.create({
                        user: user._id,
                        badge: badge.name,
                        status: "active",
                        earnedBy: "manual",
                        assignedAt: new Date(),
                        metaData: {
                            bundleId: bundle._id,
                            bundleName: bundle.name,
                            assignedVia: "bundle",
                        },
                    });
                    assigned.push(created);
                }
            }

            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        userId: user._id,
                        userType: user.userType,
                        bundleId: bundle._id,
                        bundleName: bundle.name,
                        totalAssigned: assigned.length,
                        assignedBadges: assignableBadges.map((b: any) => ({
                            badgeId: b._id,
                            badgeName: b.name,
                            badgeSlug: b.slug,
                        })),
                    },
                    "Bundle badges assigned successfully"
                )
            );
        } catch (error: any) {
            return res.status(500).json(new ApiError(500, error.message || "Failed to assign bundle badge"));
        }
    }

    // Unassign bundle badges from a user (marks badge status as rejected)
    static async unassignBundleFromUser(req: Request, res: Response) {
        try {
            const { userId, bundleId } = req.body || {};
            if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(bundleId)) {
                return res.status(400).json(new ApiError(400, "Invalid userId or bundleId"));
            }

            const bundle = await BadgeBundle.findById(bundleId).populate("badges").lean();
            if (!bundle) return res.status(404).json(new ApiError(404, "Bundle badge not found"));

            const badgeNames = (bundle.badges || []).map((badge: any) => badge?.name).filter(Boolean);
            if (!badgeNames.length) {
                return res.status(400).json(new ApiError(400, "No badges found in this bundle"));
            }

            const result = await CandidateBrandingBadge.updateMany(
                {
                    user: new Types.ObjectId(userId),
                    badge: { $in: badgeNames },
                },
                {
                    $set: {
                        status: "rejected",
                        earnedBy: "manual",
                    },
                    $unset: {
                        "metaData.bundleId": "",
                        "metaData.bundleName": "",
                        "metaData.assignedVia": "",
                    },
                }
            );

            return res.status(200).json(
                new ApiResponse(
                    200,
                    { modifiedCount: result.modifiedCount },
                    "Bundle badges unassigned successfully"
                )
            );
        } catch (error: any) {
            return res.status(500).json(new ApiError(500, error.message || "Failed to unassign bundle badge"));
        }
    }

    // Get assigned bundles summary for a user
    static async getAssignedBundlesByUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            if (!Types.ObjectId.isValid(userId)) {
                return res.status(400).json(new ApiError(400, "Invalid user id"));
            }

            const assigned = await CandidateBrandingBadge.aggregate([
                {
                    $match: {
                        user: new Types.ObjectId(userId),
                        "metaData.assignedVia": "bundle",
                        status: "active",
                    },
                },
                {
                    $group: {
                        _id: {
                            bundleId: "$metaData.bundleId",
                            bundleName: "$metaData.bundleName",
                        },
                        totalBadges: { $sum: 1 },
                        badges: { $addToSet: "$badge" },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        bundleId: "$_id.bundleId",
                        bundleName: "$_id.bundleName",
                        totalBadges: 1,
                        badges: 1,
                    },
                },
            ]);

            return res
                .status(200)
                .json(new ApiResponse(200, assigned, "Assigned bundles fetched successfully"));
        } catch (error: any) {
            return res.status(500).json(new ApiError(500, error.message || "Failed to fetch assigned bundles"));
        }
    }

    // Bulk assign bundle badges to multiple users
    static async assignBundleToUsersBulk(req: Request, res: Response) {
        try {
            const { userIds, bundleId } = req.body || {};

            if (!Array.isArray(userIds) || userIds.length === 0 || !bundleId) {
                return res.status(400).json(
                    new ApiError(400, "userIds (array) and bundleId are required")
                );
            }

            // Validate bundleId format
            if (!Types.ObjectId.isValid(bundleId)) {
                return res.status(400).json(new ApiError(400, "Invalid bundleId"));
            }

            // De-duplicate and clean userIds
            const uniqueUserIds = Array.from(
                new Set(
                    userIds
                        .map((value: any) => String(value || "").trim())
                        .filter((value: string) => Boolean(value))
                )
            );

            if (!uniqueUserIds.length) {
                return res.status(400).json(new ApiError(400, "No valid userIds were provided"));
            }

            // Fetch bundle details and users in parallel
            const [bundle, users] = await Promise.all([
                BadgeBundle.findById(bundleId).populate("badges").lean(),
                User.find({ _id: { $in: uniqueUserIds } }).select("_id userType fullName").lean(),
            ]);

            if (!bundle) {
                return res.status(404).json(new ApiError(404, "Bundle not found"));
            }

            if (!bundle.isActive) {
                return res.status(400).json(new ApiError(400, "Bundle is inactive"));
            }

            const userMap = new Map(
                users.map((entry: any) => [String(entry._id), entry])
            );

            const successes: Array<{ userId: string; userName?: string; totalAssigned?: number }> = [];
            const failed: Array<{ userId: string; message: string }> = [];

            // Process each user
            for (const userId of uniqueUserIds) {
                try {
                    const user = userMap.get(userId);

                    if (!user) {
                        failed.push({
                            userId,
                            message: "User not found",
                        });
                        continue;
                    }

                    // Check if bundle is allowed for user's type
                    if (!Array.isArray(bundle.userTypes) || !bundle.userTypes.includes(user.userType as any)) {
                        failed.push({
                            userId,
                            message: `Bundle is not allowed for userType ${user.userType}`,
                        });
                        continue;
                    }

                    const badges = Array.isArray(bundle.badges) ? bundle.badges : [];
                    if (!badges.length) {
                        failed.push({
                            userId,
                            message: "No badges found in this bundle",
                        });
                        continue;
                    }

                    // Filter assignable badges
                    const assignableBadges = badges.filter((badge: any) => {
                        const badgeUserTypes = Array.isArray(badge?.userTypes) ? badge.userTypes : [];
                        const isAllowedForUserType = badgeUserTypes.includes(user.userType);
                        return badge?.isActive && isAllowedForUserType;
                    });

                    if (!assignableBadges.length) {
                        failed.push({
                            userId,
                            message: "No eligible active badges found in this bundle for the user type",
                        });
                        continue;
                    }

                    // Assign badges
                    let assignedCount = 0;
                    for (const badgeRaw of assignableBadges) {
                        const badge: any = badgeRaw as any;
                        const existing = await CandidateBrandingBadge.findOne({
                            user: user._id,
                            badge: badge.name,
                        });

                        if (existing) {
                            existing.status = "active";
                            existing.earnedBy = "manual";
                            existing.assignedAt = new Date();
                            existing.metaData = {
                                ...(existing.metaData || {}),
                                bundleId: bundle._id,
                                bundleName: bundle.name,
                                assignedVia: "bundle",
                            };
                            await existing.save();
                            assignedCount++;
                        } else {
                            await CandidateBrandingBadge.create({
                                user: user._id,
                                badge: badge.name,
                                status: "active",
                                earnedBy: "manual",
                                assignedAt: new Date(),
                                metaData: {
                                    bundleId: bundle._id,
                                    bundleName: bundle.name,
                                    assignedVia: "bundle",
                                },
                            });
                            assignedCount++;
                        }
                    }

                    successes.push({
                        userId,
                        userName: user.fullName,
                        totalAssigned: assignedCount,
                    });
                } catch (userError: any) {
                    failed.push({
                        userId,
                        message: userError.message || "Failed to assign bundle to user",
                    });
                }
            }

            const responseStatus = failed.length > 0 ? 207 : 200;
            return res.status(responseStatus).json(
                new ApiResponse(responseStatus, {
                    bundleId: bundle._id,
                    bundleName: bundle.name,
                    requestedCount: uniqueUserIds.length,
                    successCount: successes.length,
                    failedCount: failed.length,
                    successes,
                    failed,
                }, "Bulk bundle assignment processed")
            );
        } catch (error: any) {
            return res.status(500).json(
                new ApiError(500, error.message || "Failed to perform bulk bundle assignment")
            );
        }
    }
}
