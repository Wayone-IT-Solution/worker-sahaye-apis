import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { CommunityController } from "./community.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";
import { cacheGetResponse, invalidateCacheAfterSuccess } from "../../middlewares/cacheMiddleware";

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
    invalidateCacheAfterSuccess("Community", { logLabel: "community-create" }),
    asyncHandler(createCommunity)
  )
  .get("/", authenticateToken, asyncHandler(getAllCommunitys))
  .get("/list/all", authenticateToken, cacheGetResponse("CommunityMyList", { varyByUser: true, logLabel: "community-list-all" }), asyncHandler(getAllMyCommunities))
  .get("/suggestions/all", authenticateToken, cacheGetResponse("CommunitySuggestions", { varyByUser: true, logLabel: "community-suggestions" }), asyncHandler(getAllCommunitySuggestions))
  .get("/:id", authenticateToken, asyncHandler(getCommunityById))
  .put(
    "/:id",
    authenticateToken,
    dynamicUpload([
      { name: "profileImage", maxCount: 1 },
      { name: "bannerImage", maxCount: 1 },
    ]),
    s3UploaderMiddleware("community"),
    invalidateCacheAfterSuccess("Community", { logLabel: "community-update" }),
    asyncHandler(updateCommunityById)
  )
  .delete("/:id", authenticateToken, invalidateCacheAfterSuccess("Community", { logLabel: "community-delete" }), asyncHandler(deleteCommunityById));

export default router;
