import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AcefoneController } from "./acefone.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const router = express.Router();
const {
    initiateCall,
    getBestAdminForCall,
    getCallRecords,
    getCallRecordById,
    getCounts,
    getAgents,
} = AcefoneController;

/**
 * @route POST /api/acefone/call
 * @desc Initiate a Click-to-Call
 */
router.post("/call", authenticateToken, asyncHandler(initiateCall));

/**
 * @route GET /api/acefone/best-admin
 * @desc Get the best admin for an incoming call (Round Robin style)
 */
router.get("/best-admin", authenticateToken, isAdmin, asyncHandler(getBestAdminForCall));

/**
 * @route GET /api/acefone/records
 * @desc Fetch call records from Acefone
 */
router.get("/records", authenticateToken, isAdmin, asyncHandler(getCallRecords));

/**
 * @route GET /api/acefone/records/:id
 * @desc Get a specific call record by ID
 */
router.get("/records/:id", authenticateToken, isAdmin, asyncHandler(getCallRecordById));

/**
 * @route GET /api/acefone/counts
 * @desc Get call statistics/counts
 */
router.get("/counts", authenticateToken, isAdmin, asyncHandler(getCounts));

/**
 * @route GET /api/acefone/agents
 * @desc Fetch all agents from Acefone
 */
router.get("/agents", authenticateToken, isAdmin, asyncHandler(getAgents));

export default router;
