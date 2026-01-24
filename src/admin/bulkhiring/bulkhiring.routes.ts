import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { BulkHiringController } from "./bulkhiring.controller";
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
  checkBulkHiringServiceEligibilityEndpoint,
} = BulkHiringController;

const router = express.Router();

router
  .get("/eligibility/check", authenticateToken, asyncHandler(checkBulkHiringServiceEligibilityEndpoint))
  .post("/", authenticateToken, asyncHandler(createBulkHiring))
  .get("/", authenticateToken, asyncHandler(getAllBulkHirings))
  .get("/:id", authenticateToken, asyncHandler(getBulkHiringById))
  .put("/:id", authenticateToken, asyncHandler(updateBulkHiringById))
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
