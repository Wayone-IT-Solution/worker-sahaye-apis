import express from "express";
import { asyncHandler } from './../../utils/asyncHandler';
import { DashboardController } from "./dashboard.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const { getDashboardStats } = DashboardController;

const router = express.Router();

router.get("/", authenticateToken, asyncHandler(getDashboardStats));

export default router;
