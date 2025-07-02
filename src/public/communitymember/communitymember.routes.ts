import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { CommunityMemberController } from "./communitymember.controller";

const { createCommunityMember, removeCommunityMemberById, getMembersByCommunityId } =
  CommunityMemberController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createCommunityMember))
  .put("/", authenticateToken, asyncHandler(removeCommunityMemberById))
  .get("/:communityId", authenticateToken, asyncHandler(getMembersByCommunityId))

export default router;
