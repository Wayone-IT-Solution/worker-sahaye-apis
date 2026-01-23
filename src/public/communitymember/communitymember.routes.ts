import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { CommunityMemberController } from "./communitymember.controller";

const { createCommunityMember, removeCommunityMemberById, getAllCommunityMembers, getMembersByCommunityId, checkCommunityParticipationEligibility } =
  CommunityMemberController;

const router = express.Router();

// Check community participation eligibility
router.get("/eligibility/check", authenticateToken, asyncHandler(checkCommunityParticipationEligibility));

router
  .post("/", authenticateToken, asyncHandler(createCommunityMember))
  .get("/", authenticateToken, asyncHandler(getAllCommunityMembers))
  .put("/", authenticateToken, asyncHandler(removeCommunityMemberById))
  .get("/:communityId", authenticateToken, asyncHandler(getMembersByCommunityId))

export default router;
