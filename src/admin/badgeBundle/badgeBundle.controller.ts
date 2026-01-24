import { Request, Response } from "express";
import { BadgeBundle } from "../../modals/badgeBundle.model";
import { CommonService } from "../../services/common.services";
import ApiError from "../../utils/ApiError";

// Initialize service
const badgeBundleService = new CommonService(BadgeBundle);

export class BadgeBundleController {
    // Create a new bundle
    static async create(req: Request, res: Response) {
        try {
            const bundleData = req.body;
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
            const query = req.query;
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
