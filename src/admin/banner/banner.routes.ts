import express from "express";
import { BannerController } from "./banner.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBannerById,
  deleteBannerById,
} = BannerController;

const router = express.Router();

router
  .get("/", asyncHandler(getAllBanners))
  .post("/",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "image", maxCount: 1 }]),
    s3UploaderMiddleware("banner"),
    asyncHandler(createBanner))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getBannerById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "image", maxCount: 1 }]),
    s3UploaderMiddleware("banner"),
    asyncHandler(updateBannerById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteBannerById));

export default router;
