import { Router } from "express";
import userRoutes from "./user/user.routes";

const router = Router();

/**
 * =============================
 * Main Application Route Index
 * =============================
 * All modular routes should be registered here with proper prefixes.
 * This allows better separation of concerns and scalable structure.
 */

// User-related routes (e.g., registration, OTP, profile)
router.use("/user", userRoutes); // Routes will be prefixed with /user

export default router;
