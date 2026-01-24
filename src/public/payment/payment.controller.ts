import { Request, Response } from "express";
import crypto from "crypto";
import { razorpay } from "../../config/razorpay";
import { BadgeBundle } from "../../modals/badgeBundle.model";
import { Subscription } from "../../modals/subscription.model";

interface AuthRequest extends Request {
  user?: { id: string; role?: string };
}

export class PaymentController {
  static async createOrder(req: AuthRequest, res: Response) {
    try {
      const { bundleId } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      console.log("createOrder - Request data:", { bundleId, userId, userRole });

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const bundle = await BadgeBundle.findById(bundleId);
      console.log("createOrder - Bundle found:", bundle);

      if (!bundle || !bundle.isActive) {
        return res.status(404).json({ message: "Bundle not found" });
      }

      // Check if user's role matches any of the bundle's userTypes
      if (!userRole || !bundle.userTypes.includes(userRole as any)) {
        return res.status(403).json({
          message: "Your role is not eligible for this bundle",
          allowedRoles: bundle.userTypes,
          userRole
        });
      }

      const existing = await Subscription.findOne({
        user: userId,
        bundle: bundleId,
        status: "active",
      });

      if (existing) {
        return res.status(409).json({
          message: "Active subscription already exists",
        });
      }

      if (!bundle.fee || bundle.fee === 0) {
        const nextBillingDate = new Date();
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);

        await Subscription.create({
          user: userId,
          bundle: bundleId,
          amount: 0,
          startDate: new Date(),
          nextBillingDate,
          status: "active",
        });

        return res.json({
          success: true,
          message: "Free plan activated successfully",
        });
      }

      const order = await razorpay.orders.create({
        amount: bundle.fee * 100,
        currency: "INR",
        receipt: `b_${bundleId.slice(-6)}_u_${userId.slice(-6)}`,
        // receipt: `bundle_${bundleId}_user_${userId}`,
      });

      return res.json({
        success: true,
        order,
        key: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      console.error("createOrder error:", error);
      throw error;
    }
  }

  static async verifyPayment(req: AuthRequest, res: Response) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bundleId,
    } = req.body;

    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const alreadyPaid = await Subscription.findOne({
      razorpayPaymentId: razorpay_payment_id,
    });

    if (alreadyPaid) {
      return res.json({
        success: true,
        message: "Payment already processed",
      });
    }
    const bundle = await BadgeBundle.findById(bundleId);
    if (!bundle) throw new Error("Bundle not found");

    // Check if user's role matches any of the bundle's userTypes
    if (!userRole || !bundle.userTypes.includes(userRole as any)) {
      return res.status(403).json({
        message: "Your role is not eligible for this bundle",
        allowedRoles: bundle.userTypes,
        userRole
      });
    }

    if (!bundle.fee || bundle.fee === 0) {
      return res.status(400).json({
        message: "Verification not required for free plans",
      });
    }

    const nextBillingDate = new Date();
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);

    await Subscription.create({
      user: userId,
      bundle: bundleId,
      amount: bundle.fee,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      startDate: new Date(),
      nextBillingDate,
      status: "active",
    });

    return res.json({
      success: true,
      message: "Payment successful & subscription activated",
    });
  }
}

