import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { WorkercategoryController } from "./workercategory.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createWorkercategory,
  getAllWorkercategorys,
  getWorkercategoryById,
  updateWorkercategoryById,
  deleteWorkercategoryById,
} = WorkercategoryController;

const router = express.Router();

router
  .get("/", authenticateToken, asyncHandler(getAllWorkercategorys))
  .post("/", authenticateToken, isAdmin, asyncHandler(createWorkercategory))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getWorkercategoryById))
  .put(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateWorkercategoryById)
  )
  .delete(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(deleteWorkercategoryById)
  );

export default router;
