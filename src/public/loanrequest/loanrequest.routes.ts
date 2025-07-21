import { Router } from "express";
import { asyncHandler } from "./../../utils/asyncHandler";
import {
  updateStatus,
  getAllRequests,
  assignVirtualHR,
  createLoanRequest,
  getAllLoanRequests,
} from "./loanrequest.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const router = Router();

router.get("/all", authenticateToken, asyncHandler(getAllRequests));
router.post("/", authenticateToken, asyncHandler(createLoanRequest));
router.get("/", authenticateToken, asyncHandler(getAllLoanRequests))
  .post(
    "/:id/assign",
    authenticateToken,
    isAdmin,
    asyncHandler(assignVirtualHR)
  )
  .patch(
    "/all/:id/update-status",
    authenticateToken,
    asyncHandler(updateStatus)
  )

export default router;
