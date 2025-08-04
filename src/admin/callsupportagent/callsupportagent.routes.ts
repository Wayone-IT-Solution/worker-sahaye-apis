import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { CallSupportAgentController } from "./callsupportagent.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";

const {
  createCallSupportAgent,
  getAllCallSupportAgents,
  getCallSupportAgentById,
  updateCallSupportAgentById,
  deleteCallSupportAgentById,
} = CallSupportAgentController;

const router = express.Router();

router
  .post(
    "/",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "profileImageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("profile"),
    asyncHandler(createCallSupportAgent)
  )
  .get("/", authenticateToken, isAdmin, asyncHandler(getAllCallSupportAgents))
  .get(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(getCallSupportAgentById)
  )
  .put(
    "/:id",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "profileImageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("profile"),
    asyncHandler(updateCallSupportAgentById)
  )
  .delete(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(deleteCallSupportAgentById)
  );

export default router;
