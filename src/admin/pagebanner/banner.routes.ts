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
  deleteImageBannerById
} = BannerController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllBanners))
  .post("/",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "image", maxCount: 5 }]),
    s3UploaderMiddleware("banner"),
    asyncHandler(createBanner))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getBannerById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "image", maxCount: 5 }]),
    s3UploaderMiddleware("banner"),
    asyncHandler(updateBannerById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteBannerById))
  .delete("/image/:id", authenticateToken, isAdmin, asyncHandler(deleteImageBannerById));

export default router;
