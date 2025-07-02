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
  getAllMyCommunities,
  updateCommunityById,
  deleteCommunityById,
  getAllCommunitySuggestions,
} = CommunityController;

const router = express.Router();

router
  .post(
    "/",
    authenticateToken,
    dynamicUpload([
      { name: "profileImage", maxCount: 1 },
      { name: "bannerImage", maxCount: 1 },
    ]),
    s3UploaderMiddleware("community"),
    asyncHandler(createCommunity)
  )
  .get("/", authenticateToken, asyncHandler(getAllCommunitys))
  .get("/:id", authenticateToken, asyncHandler(getCommunityById))
  .get("/list/all", authenticateToken, asyncHandler(getAllMyCommunities))
  .get("/suggestions/all", authenticateToken, asyncHandler(getAllCommunitySuggestions))
  .put(
    "/:id",
    authenticateToken,
    dynamicUpload([
      { name: "profileImage", maxCount: 1 },
      { name: "bannerImage", maxCount: 1 },
    ]),
    s3UploaderMiddleware("community"),
    asyncHandler(updateCommunityById)
  )
  .delete("/:id", authenticateToken, asyncHandler(deleteCommunityById));

export default router;
