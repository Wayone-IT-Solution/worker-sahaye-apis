import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { TopRecruiterController } from "./toprecruiter.controller";
import { allowAllExcept, authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createTopRecruiter,
  getAllTopRecruiters,
  getTopRecruiterById,
  updateTopRecruiterById,
  deleteTopRecruiterById,
  getTopRecruiterDetails
} = TopRecruiterController;

const router = express.Router();

router
  .get("/:userType",
    authenticateToken,
    isAdmin,
    asyncHandler(getAllTopRecruiters))
  .get("/:userType/:id", authenticateToken, isAdmin, asyncHandler(getTopRecruiterById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateTopRecruiterById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteTopRecruiterById))
  .post("/",
    authenticateToken,
    allowAllExcept(["admin", "agent", "worker"] as any),
    asyncHandler(createTopRecruiter))
  .patch("/",
    authenticateToken,
    allowAllExcept(["admin", "agent", "worker"] as any),
    asyncHandler(getTopRecruiterDetails));

export default router;
