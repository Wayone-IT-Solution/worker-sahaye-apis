import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { CommunityController } from "./community.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";

const {
  createCommunity,
  getAllCommunitys,
  getCommunityById,
  updateCommunityById,
  deleteCommunityById,
} = CommunityController;

const router = express.Router();

router
  .post(
    "/",
    dynamicUpload([
      { name: "profileImage", maxCount: 1 },
      { name: "bannerImage", maxCount: 1 },
    ]),
    s3UploaderMiddleware("community"),
    asyncHandler(createCommunity)
  )
  .get("/", asyncHandler(getAllCommunitys))
  .get("/:id", asyncHandler(getCommunityById))
  .put(
    "/:id",
    dynamicUpload([
      { name: "profileImage", maxCount: 1 },
      { name: "bannerImage", maxCount: 1 },
    ]),
    s3UploaderMiddleware("community"),
    asyncHandler(updateCommunityById)
  )
  .delete("/:id", asyncHandler(deleteCommunityById));

export default router;
