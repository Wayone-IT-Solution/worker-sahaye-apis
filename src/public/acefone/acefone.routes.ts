import { Router } from "express";
import { AcefoneController } from "./acefone.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken } from "../../middlewares/authMiddleware";

const acefoneRouter = Router();

/**
 * @route POST /api/acefone/call
 * @desc Initiate a call to a support agent; body must include `callField` with one of ["ESIC","EPFO","LOAN","LWF"].
 * @access Private (Worker/Employer)
 */
acefoneRouter.post(
  "/call",
  authenticateToken,
  asyncHandler(AcefoneController.initiateSupportCall),
);

/**
 * @route GET /ivr/acefone/records
 * @desc Fetch call records from Acefone
 * @access Private (Admin)
 */
acefoneRouter.get(
  "/records",
  authenticateToken,
  asyncHandler(AcefoneController.getCallRecords),
);

/**
 * @route GET /api/acefone/getAll
 * @desc Fetch internal call records from database
 * @access Private (Admin)
 */
acefoneRouter.get(
  "/getAll",
  authenticateToken,
  asyncHandler(AcefoneController.getAllCalls),
);

/**
 * @route POST /api/acefone/webhook
 * @desc Handle webhook from Acefone for call events
 * @access Public (Webhook)
 */
acefoneRouter.post("/webhook", asyncHandler(AcefoneController.handleWebhook));

export default acefoneRouter;
