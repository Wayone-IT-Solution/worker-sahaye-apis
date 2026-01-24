import express from "express";
import { PaymentController } from "./payment.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = express.Router();

router.post("/create-order", authenticateToken, asyncHandler(PaymentController.createOrder));
router.post("/verify", authenticateToken, asyncHandler(PaymentController.verifyPayment));

export default router;
