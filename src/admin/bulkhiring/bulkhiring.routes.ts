import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { BulkHiringController } from "./bulkhiring.controller";
import { authorizeFeature } from "../../middlewares/enrollMiddleware";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  updateStatus,
  assignVirtualHR,
  createBulkHiring,
  getAllBulkHirings,
  getBulkHiringById,
  assignSalesPerson,
  updateBulkHiringById,
  deleteBulkHiringById,
} = BulkHiringController;

const router = express.Router();

router
  .post("/", authenticateToken, authorizeFeature("bulk_hiring"), asyncHandler(createBulkHiring))
  .get("/", authenticateToken, authorizeFeature("bulk_hiring"), asyncHandler(getAllBulkHirings))
  .get("/:id", authenticateToken, asyncHandler(getBulkHiringById))
  .put("/:id", authenticateToken, authorizeFeature("bulk_hiring"), asyncHandler(updateBulkHiringById))
  .delete("/:id", authenticateToken, asyncHandler(deleteBulkHiringById))
  .post(
    "/:id/assign",
    authenticateToken,
    isAdmin,
    asyncHandler(assignVirtualHR)
  )
  .post(
    "/:id/sales",
    authenticateToken,
    isAdmin,
    asyncHandler(assignSalesPerson)
  )
  .patch(
    "/:id/update-status",
    authenticateToken,
    asyncHandler(updateStatus)
  )

export default router;
