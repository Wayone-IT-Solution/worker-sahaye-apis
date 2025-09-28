import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CandidateBrandingContentModel } from "../../modals/brandingcontent.model";

export class BrandingContentController {
  /**
   * Create or Update Branding Content (only 1 document allowed)
   */
  static async upsertBrandingContent(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await CandidateBrandingContentModel.findOneAndUpdate(
        {},
        req.body,
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Branding content saved successfully"));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Branding Content (the only document)
   */
  static async getBrandingContent(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await CandidateBrandingContentModel.findOne();
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }
}
