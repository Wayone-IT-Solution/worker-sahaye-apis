import { Request, Response, NextFunction } from "express";
import { SaveItem, SaveItemType, SavedByType } from "../../modals/saveitems.model";
import { Job } from "../../modals/job.model";
import { User } from "../../modals/user.model";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";

export class SaveItemController {
  /**
   * Save an item (Linear Flow)
   */
  static async saveItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId, role } = (req as any).user;
      const { type, referenceId } = req.body;

      // 1. Basic Validation
      if (!type || !referenceId) return res.status(400).json(new ApiError(400, "type and referenceId are required"));

      // 2. Check if already saved (Deduplicate)
      const existing = await SaveItem.findOne({ user: userId, referenceId, type }).lean();
      if (existing) return res.status(200).json(new ApiResponse(200, existing, "Item already saved"));

      // 3. Verify item existence
      const Model: any = type === SaveItemType.PROFILE ? User : Job;
      const item = await Model.findById(referenceId).select("_id").lean();
      if (!item) return res.status(404).json(new ApiError(404, `${type} not found`));

      // 4. Create and Save
      const saveItem = await SaveItem.create({
        user: userId,
        savedBy: role as SavedByType,
        type,
        referenceId,
      });

      // 5. Response with usage info (from middleware)
      const usage = (req as any).saveLimitContext;
      return res.status(201).json(new ApiResponse(201, { saveItem, usage }, "Item saved successfully"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get user's saved items
   */
  static async getSaveItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = (req as any).user;
      const { page = 1, limit = 10, type } = req.query;

      const filters: any = { user: userId };
      if (type) filters.type = type;

      const saveItems = await SaveItem.find(filters)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean();

      const total = await SaveItem.countDocuments(filters);

      return res.status(200).json(new ApiResponse(200, {
        data: saveItems,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
      }, "Saved items fetched"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Remove saved item
   */
  static async removeSaveItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = (req as any).user;
      const result = await SaveItem.findOneAndDelete({ _id: req.params.saveItemId, user: userId });

      if (!result) return res.status(404).json(new ApiError(404, "Save item not found"));
      return res.status(200).json(new ApiResponse(200, null, "Item removed from saves"));
    } catch (err) {
      next(err);
    }
  }
}
