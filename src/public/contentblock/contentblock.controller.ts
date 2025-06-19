import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { CommonService } from "../../services/common.services";
import { ContentBlock } from "../../modals/contentblock.model";

const ContentBlockService = new CommonService(ContentBlock);

// const checkContentAccess = (
//   userRole: string,
//   access: "free" | "paid" | "premium"
// ): boolean => {
//   if (access === "free") return true;
//   if (access === "paid" && ["paid", "premium"].includes(userRole)) return true;
//   if (access === "premium" && userRole === "premium") return true;
//   return false;
// };

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

// Get by key (with access control)
export const getContentBlockByKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // const key = req.params.key;
    // const userRole = (req as any)?.user?.subscription || "free";
    // const block = await ContentBlock.findOne({ key });
    // if (!block)
    //   return res.status(404).json(new ApiError(404, "Content block not found"));
    // if (!checkContentAccess(userRole, block.access)) {
    //   return res
    //     .status(403)
    //     .json(
    //       new ApiError(
    //         403,
    //         `Upgrade to ${block.access} plan to access this content`
    //       )
    //     );
    // }
    // return res
    //   .status(200)
    //   .json(new ApiResponse(200, block, "Content block fetched"));
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
