import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import {
  SaveItem,
  SaveType,
  ReferenceType,
  SavedByType,
} from "../../modals/saveitems.model";
import { Job } from "../../modals/job.model";
import { User } from "../../modals/user.model";

export class SaveItemController {
  /**
   * Save an item
   * POST /api/saveitems
   */
  static async saveItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId, role } = (req as any).user;
      const { referenceType, referenceId, saveType } = req.body;

      // Validate enum values
      if (!Object.values(ReferenceType).includes(referenceType)) {
        return res.status(400).json(new ApiError(400, "Invalid referenceType"));
      }

      if (!Object.values(SaveType).includes(saveType)) {
        return res.status(400).json(new ApiError(400, "Invalid saveType"));
      }

      // Check if already saved
      const alreadySaved = await (SaveItem as any).isSaved(
        userId,
        referenceId,
        referenceType,
      );
      if (alreadySaved) {
        const existing = await SaveItem.findOne({
          user: userId,
          referenceId,
          referenceType,
        });
        return res
          .status(200)
          .json(new ApiResponse(200, existing, "Item already saved"));
      }

      // Verify referenced item exists
      let itemExists: boolean = false;
      if (referenceType === ReferenceType.JOB) {
        itemExists = !!(await Job.findById(referenceId).lean());
      } else if (referenceType === ReferenceType.USER) {
        itemExists = !!(await User.findById(referenceId).lean());
      }

      if (!itemExists) {
        return res
          .status(404)
          .json(
            new ApiError(
              404,
              `${referenceType} with ID ${referenceId} not found`,
            ),
          );
      }

      // Create save item
      const saveItem = new SaveItem({
        user: userId,
        savedBy: role as SavedByType,
        saveType,
        referenceId,
        referenceType,
      });

      await saveItem.save();

      // Get updated save limit context for response
      const limitContext = (req as any).saveLimitContext;

      return res.status(201).json(
        new ApiResponse(
          201,
          {
            saveItem,
            usage: limitContext
              ? {
                  used: limitContext.used + 1, // Include this newly saved item
                  limit: limitContext.limit,
                  remaining: limitContext.isUnlimited
                    ? null
                    : (limitContext.remaining as number) - 1,
                  planName: limitContext.plan.displayName,
                }
              : undefined,
          },
          "Item saved successfully",
        ),
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get user's saved items
   * GET /api/saveitems
   */
  static async getSaveItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = (req as any).user;
      const { page = 1, limit = 10, saveType, referenceType } = req.query;

      const filters: any = { user: userId };
      if (saveType) filters.saveType = saveType;
      if (referenceType) filters.referenceType = referenceType;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const saveItems = await SaveItem.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean();

      const total = await SaveItem.countDocuments(filters);

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            data: saveItems,
            pagination: {
              page: parseInt(page as string),
              limit: parseInt(limit as string),
              total,
              totalPages: Math.ceil(total / parseInt(limit as string)),
            },
          },
          "Saved items fetched",
        ),
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Remove saved item
   * DELETE /api/saveitems/:saveItemId
   */
  static async removeSaveItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { saveItemId } = req.params;
      const { id: userId } = (req as any).user;

      const result = await SaveItem.findOneAndDelete({
        _id: saveItemId,
        user: userId,
      });

      if (!result) {
        return res.status(404).json(new ApiError(404, "Not found"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Item removed from saves"));
    } catch (err) {
      next(err);
    }
  }
}
