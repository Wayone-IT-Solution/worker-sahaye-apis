import express from "express";
import { asyncHandler } from "./../../utils/asyncHandler";
import {
  createConnection,
  getAllConnections,
  getConnectionById,
  getSuggestedUsers,
  updateConnectionById,
  removeConnectionById,
  getAllAdminConnections,
} from "./connection.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createConnection))
  .get("/", authenticateToken, asyncHandler(getAllConnections))
  .get("/:id", authenticateToken, asyncHandler(getConnectionById))
  .put("/:id", authenticateToken, asyncHandler(updateConnectionById))
  .delete("/:id", authenticateToken, asyncHandler(removeConnectionById))
  .get("/list/all", authenticateToken, asyncHandler(getAllAdminConnections))
  .get("/suggestions/all", authenticateToken, asyncHandler(getSuggestedUsers));

export default router;
