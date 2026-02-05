import { Request, Response } from "express";
import { BadgeBundle } from "../../modals/badgeBundle.model";
import { CommonService } from "../../services/common.services";
import ApiError from "../../utils/ApiError";
import { Types } from "mongoose";

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
}
