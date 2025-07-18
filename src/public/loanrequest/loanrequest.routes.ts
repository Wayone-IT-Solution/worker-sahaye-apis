import { Router } from "express";
import { asyncHandler } from "./../../utils/asyncHandler";
import {
  getAllRequests,
  createLoanRequest,
  getAllLoanRequests,
} from "./loanrequest.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const router = Router();

router.get("/all", authenticateToken, asyncHandler(getAllRequests));
router.post("/", authenticateToken, asyncHandler(createLoanRequest));
router.get("/", authenticateToken, asyncHandler(getAllLoanRequests));

export default router;
