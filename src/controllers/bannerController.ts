import { Request, Response, NextFunction } from "express";
import Banner, { IBanner, BannerStatus } from "../modals/bannerModel";
import { getPipeline, paginationResult } from "../utils/helper";

export class BannerController {
  /**
   * 🟢 Get all active banners (Public Route)
   */
  static async getActiveBanners(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { slug } = _req.query;
      const filter: any = { status: BannerStatus.ACTIVE };
      if (slug) filter.pageUrl = slug;

      const banners = await Banner.find(filter).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        data: banners,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🆕 Create a new banner (Admin only)
   */
  static async createBanner(
    req: Request<
      {},
      {},
      Pick<
        IBanner,
        "title" | "description" | "fileUrl" | "link" | "status" | "pageUrl"
      >
    >,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { generatedId }: any = req;
      const { title, description, fileUrl, link, status, pageUrl } = req.body;
      const banner = await Banner.create({
        title,
        link,
        pageUrl,
        fileUrl,
        description,
        _id: generatedId,
        status: status || BannerStatus.INACTIVE,
      });

      res.status(201).json({
        success: true,
        message: "Banner created successfully",
        data: banner,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 📢 Get all active banners (Public)
   */
  static async getPublicBanners(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const banners = await Banner.find({ status: BannerStatus.ACTIVE }).sort({
        createdAt: -1,
      });
      res.status(200).json({ success: true, data: banners });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🛠 Get all banners (Admin only)
   */
  static async getAllBanners(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { page = 1, limit = 10 }: any = _req.query;
      const { pipeline, matchStage, options } = getPipeline(_req.query);

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      pipeline.push({
        $project: {
          _id: 1,
          link: 1,
          title: 1,
          status: 1,
          fileUrl: 1,
          pageUrl: 1,
          createdAt: 1,
        },
      });
      const banners = await Banner.aggregate(pipeline, options);
      const totalbanners = await Banner.countDocuments(
        Object.keys(matchStage).length > 0 ? matchStage : {},
      );

      if (!banners || banners.length === 0) {
        res.status(404).json({ success: false, message: "banners not found" });
        return;
      }

      const response = paginationResult(
        pageNumber,
        limitNumber,
        totalbanners,
        banners,
      );
      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🔍 Get a single banner by ID (Admin only)
   */
  static async getBannerById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const banner = await Banner.findById(req.params.id);
      if (!banner) {
        res.status(404).json({ success: false, message: "Banner not found" });
        return;
      }

      res.status(200).json({ success: true, data: banner });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✏️ Update a banner (Admin only)
   */
  static async updateBanner(
    req: Request<{ id: string }, {}, Partial<IBanner>>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const updatedBanner = await Banner.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        },
      );

      if (!updatedBanner) {
        res.status(404).json({ success: false, message: "Banner not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Banner updated successfully",
        data: updatedBanner,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🗑 Delete a banner (Admin only)
   */
  static async deleteBanner(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const deletedBanner = await Banner.findByIdAndDelete(req.params.id);
      if (!deletedBanner) {
        res.status(404).json({ success: false, message: "Banner not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Banner deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
