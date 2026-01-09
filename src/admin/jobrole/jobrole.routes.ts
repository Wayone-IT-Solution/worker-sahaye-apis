import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { JobRoleController } from "./jobrole.controller";
import { isAdmin, authenticateToken } from "../../middlewares/authMiddleware";

const {
  createJobRole,
  getAllJobRoles,
  getJobRoleById,
  getJobRoleBySlug,
  updateJobRoleById,
  deleteJobRoleById,
  searchJobRoles,
  getActiveJobRoles,
} = JobRoleController;

const router = express.Router();

router
  .post(
    "/",
    authenticateToken,
    isAdmin,
    asyncHandler(createJobRole)
  )
  .get("/", asyncHandler(getAllJobRoles))
  .get("/active/list", asyncHandler(getActiveJobRoles))
  .get("/search/query", asyncHandler(searchJobRoles))
  .get("/slug/:slug", asyncHandler(getJobRoleBySlug))
  .get("/:id", asyncHandler(getJobRoleById))
  .put(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateJobRoleById)
  )
  .delete(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(deleteJobRoleById)
  );

export default router;
