import { Router } from "express";
import userRoutes from "./userRoutes";
import fareRoutes from "./fare.routes";
import rideRoutes from "./ride.routes";
import driverRoutes from "./driverRoutes";
import messageRoutes from "./messageRoutes";
import dashboardRoutes from "./dashboardRoutes";
import passengerRoutes from "./passengerRoutes";
import promotionRoutes from "./promotion.routes";
import reviewRoutes from "./ratingReview.routes";
import customerSupportRoutes from "./ticket.route";
import SurgePricingRoutes from "./surgePricing.routes";
import { getAllNotifications } from "../services/notification.service";
import { authenticateToken, isAdmin } from "../middlewares/authMiddleware";

const router = Router();

/**
 * ===========================
 * User Routes (Admin Only)
 * ===========================
 * @route   /api/admin
 * @desc    Admin user tasks
 * @access  Admin only
 */
router.use("/admin", userRoutes);

/**
 * ===========================
 * Contact Routes
 * ===========================
 * @route   /api/conversation
 * @desc    conversation form handling
 * @access  Public
 */
router.use("/conversation", messageRoutes);

/**
 * ===========================
 * Dashboard Routes
 * ===========================
 * @route   /api/dashboard
 * @desc    Dashboard overview
 * @access  Admin
 */
router.use("/dashboard", dashboardRoutes);

/**
 * ===========================
 * Passenger Routes
 * ===========================
 * @route   /api/passenger
 * @desc    Passenger registration, login, OTP verification
 * @access  Public/Protected
 */
router.use("/passenger", passengerRoutes);

/**
 * ===========================
 * Driver Routes
 * ===========================
 * @route   /api/passenger
 * @desc    Driver registration, login, OTP verification
 * @access  Public/Protected
 */
router.use("/driver", driverRoutes);

/**
 * ===========================
 * Ride Routes
 * ===========================
 * @route   /api/ride
 * @desc    Ride management
 * @access  Protected
 */
router.use("/ride", rideRoutes);

/**
 * ===========================
 * Customer Support Routes
 * ===========================
 * @route   /api/support
 * @desc    Ride management
 * @access  All Protected
 */
router.use("/support", customerSupportRoutes);

/**
 * ===========================
 * Review Routes
 * ===========================
 * @route   /api/support
 * @desc    Review management
 * @access  Public / Protected
 */
router.use("/review", reviewRoutes);

/**
 * ===========================
 * Promotion Routes
 * ===========================
 * @route   /api/coupon
 * @desc    Promotion management
 * @access  Public / Protected
 */
router.use("/coupon", promotionRoutes);

/**
 * ===========================
 * Surge Pricing Routes
 * ===========================
 * @route   /api/surge
 * @desc    Promotion management
 * @access  Protected
 */
router.use("/surge", SurgePricingRoutes);

/**
 * ===========================
 * Fare Routes
 * ===========================
 * @route   /api/fare
 * @desc    Fare management
 * @access  Protected
 */
router.use("/fare", authenticateToken, isAdmin, fareRoutes);
router.get("/notification", authenticateToken, getAllNotifications);

export default router;
