import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ServetelController } from "./servetel.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const router = express.Router();
const {
  initiateCall,
  getCallStats,
  getCallRecordings,
  getCallForwardingRules,
} = ServetelController;

router.post("/call", authenticateToken, isAdmin, asyncHandler(initiateCall));
router.get("/stats", authenticateToken, isAdmin, asyncHandler(getCallStats));
router.get(
  "/recordings",
  authenticateToken,
  isAdmin,
  asyncHandler(getCallRecordings)
);
router.get(
  "/forwarding",
  authenticateToken,
  isAdmin,
  asyncHandler(getCallForwardingRules)
);

export default router;
