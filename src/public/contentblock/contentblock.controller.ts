import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { CommonService } from "../../services/common.services";
import { ContentBlock } from "../../modals/contentblock.model";
import { SubscriptionPlan } from "../../modals/subscriptionplan.model";

const ContentBlockService = new CommonService(ContentBlock);

export const createContentBlock = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.body.key || !req.body.title || !req.body.sections) {
      return res
        .status(400)
        .json(new ApiError(400, "Key, title and sections are required"));
    }
    const block = await ContentBlockService.create(req.body);
    return res
      .status(201)
      .json(new ApiResponse(201, block, "Content block created"));
  } catch (error) {
    return next(new ApiError(500, "Failed to create content block", error));
  }
};

export const getAllContentBlocks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const blocks = await ContentBlockService.getAll(req.query);
    return res
      .status(200)
      .json(new ApiResponse(200, blocks, "All content blocks fetched"));
  } catch (error) {
    return next(new ApiError(500, "Failed to fetch content blocks", error));
  }
};

export const getContentBlockByKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let enrolled = true;
    const key = req.params.key;
    const user = (req as any).user;

    const block = await ContentBlock.findOne({ key });
    if (!block) return res.status(404).json(new ApiError(404, "Content block not found"));

    const enrolledPlan = await EnrolledPlan.findOne({ user: user.id, status: "active" });

    if (!enrolledPlan?.plan) enrolled = false
    const now = new Date();
    if (enrolledPlan && enrolledPlan.expiredAt && now > enrolledPlan.expiredAt) {
      enrolled = false
    }
    let plan;
    if (enrolledPlan) {
      plan = await SubscriptionPlan.findById(enrolledPlan.plan).populate("features", "key");
      if (!plan) enrolled = false
    }

    if (plan?.features) {
      const allowedFeatureKeys = plan.features.map((f: any) => f.key);
      enrolled = allowedFeatureKeys.includes(key);
    }

    return res.status(200).json(new ApiResponse(200, {
      enrolled,
      reason: enrolled
        ? "Access granted"
        : "Access denied: This content is not included in your current plan.",
      content: block
    }));
  } catch (error) {
    return next(new ApiError(500, "Failed to fetch content block", error));
  }
};

export const getBlockContentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;
    const result = await ContentBlockService.getById(id);
    if (!result)
      return res.status(404).json(new ApiError(404, "Content block not found"));
    return res
      .status(200)
      .json(
        new ApiResponse(200, result, "Content block fetched successfully!")
      );
  } catch (error) {
    return next(new ApiError(500, "Failed to update content block", error));
  }
};

export const updateContentBlockByKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;
    const updated = await ContentBlockService.updateById(id, req.body);
    if (!updated)
      return res.status(404).json(new ApiError(404, "Content block not found"));
    return res
      .status(200)
      .json(new ApiResponse(200, updated, "Content block updated"));
  } catch (error) {
    return next(new ApiError(500, "Failed to update content block", error));
  }
};

export const deleteContentBlockByKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;
    const deleted = await ContentBlockService.deleteById(id);
    if (!deleted)
      return res.status(404).json(new ApiError(404, "Content block not found"));
    return res
      .status(200)
      .json(new ApiResponse(200, deleted, "Content block deleted"));
  } catch (error) {
    return next(new ApiError(500, "Failed to delete content block", error));
  }
};
