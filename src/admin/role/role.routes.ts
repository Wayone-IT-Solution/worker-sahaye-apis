import express from "express";
import { RoleController } from "./role.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createRole,
  getAllRoles,
  getRoleById,
  updateRoleById,
  deleteRoleById,
} = RoleController;

const router = express.Router();

router
  .get("/", authenticateToken, isAdmin, asyncHandler(getAllRoles))
  .post("/", authenticateToken, isAdmin, asyncHandler(createRole))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getRoleById))
  .put("/:id", authenticateToken, isAdmin, asyncHandler(updateRoleById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteRoleById));

export default router;
