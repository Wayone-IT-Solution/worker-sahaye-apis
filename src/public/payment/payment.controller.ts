import { Request, Response } from "express";
import crypto from "crypto";
import { razorpay } from "../../config/razorpay";
import { BadgeBundle, UserType } from "../../modals/badgeBundle.model";
import { Subscription } from "../../modals/subscription.model";
import mongoose from "mongoose";

interface AuthRequest extends Request {
  user?: { id: string; role?: UserType };
}

export class PaymentController {
  // static async createOrder(req: AuthRequest, res: Response) {
  //   try {
  //     const { bundleId } = req.body;
  //     if (!bundleId) {
  //       console.error("createOrder error: missing bundleId in request body");
  //       return res.status(400).json({ success: false, message: "bundleId is required" });
  //     }
  //     const userId = req.user?.id;
  //     const userRole = req.user?.role;

  //     console.log("createOrder - Request data:", { bundleId, userId, userRole });

  //     if (!userId) {
  //       return res.status(401).json({ message: "Unauthorized" });
  //     }

  //     const bundle = await BadgeBundle.findById(bundleId);
  //     console.log("createOrder - Bundle found:", bundle);

  //     if (!bundle || !bundle.isActive) {
  //       return res.status(404).json({ message: "Bundle not found" });
  //     }

  //     // Check if user's role matches any of the bundle's userTypes
  //     if (!userRole || !bundle.userTypes.includes(userRole as any)) {
  //       return res.status(403).json({
  //         message: "Your role is not eligible for this bundle",
  //         allowedRoles: bundle.userTypes,
  //         userRole
  //       });
  //     }

  //     const existing = await Subscription.findOne({
  //       user: userId,
  //       bundle: bundleId,
  //       status: "active",
  //     });

  //     if (existing) {
  //       return res.status(409).json({
  //         message: "Active subscription already exists",
  //       });
  //     }

  //     if (!bundle.fee || bundle.fee === 0) {
  //       const nextBillingDate = new Date();
  //       nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);

  //       await Subscription.create({
  //         user: userId,
  //         bundle: bundleId,
  //         amount: 0,
  //         startDate: new Date(),
  //         nextBillingDate,
  //         status: "active",
  //       });

  //       return res.json({
  //         success: true,
  //         message: "Free plan activated successfully",
  //       });
  //     }

  //     let order;
  //     try {
  //       // Safely derive short ids for receipt (bundleId/userId may be ObjectId or string)
  //       const bIdShort = bundle._id ? String(bundle._id).slice(-6) : String(bundleId).slice(-6);
  //       const uIdShort = userId ? String(userId).slice(-6) : "unknown";

  //       order = await razorpay.orders.create({
  //         amount: Number(bundle.fee) * 100,
  //         currency: "INR",
  //         receipt: `b_${bIdShort}_u_${uIdShort}`,
  //       });
  //     } catch (rpErr: any) {
  //       console.error("Razorpay create order error:", rpErr?.message || rpErr, rpErr?.stack || "");
  //       return res.status(502).json({
  //         success: false,
  //         message: "Payment gateway error while creating order",
  //       });
  //     }

  //     return res.json({
  //       success: true,
  //       order,
  //       key: process.env.RAZORPAY_KEY_ID,
  //     });
  //   } catch (error: any) {
  //     console.error("createOrder error:", error?.message || error, error?.stack || "");
  //     return res.status(500).json({
  //       success: false,
  //       message: "Internal Server Error",
  //     });
  //   }
  // }

  static async createOrder(req: AuthRequest, res: Response) {
    try {
      const { bundleId } = req.body;

      if (!bundleId) {
        return res.status(400).json({ success: false, message: "bundleId is required" });
      }

      if (!mongoose.Types.ObjectId.isValid(bundleId)) {
        return res.status(400).json({ success: false, message: "Invalid bundleId format" });
      }

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const bundle = await BadgeBundle.findById(bundleId);

      if (!bundle || !bundle.isActive) {
        return res.status(404).json({ message: "Bundle not found" });
      }

      // SAFE role check
      const allowedRoles = bundle.userTypes as UserType[];

      if (!userRole || !Array.isArray(allowedRoles) || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          message: "Your role is not eligible for this bundle",
          allowedRoles,
          userRole,
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

      // FREE PLAN
      if (!bundle.fee || Number(bundle.fee) === 0) {
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

      // VALIDATE AMOUNT
      const amount = Number(bundle.fee);
      if (!amount || isNaN(amount)) {
        console.error("Invalid bundle fee:", bundle.fee);
        return res.status(500).json({ message: "Invalid bundle fee configuration" });
      }

      // VALIDATE RAZORPAY CONFIG
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error("Razorpay keys missing in environment");
        return res.status(500).json({ message: "Payment configuration error" });
      }

      if (!razorpay || !razorpay.orders) {
        console.error("Razorpay instance not initialized correctly");
        return res.status(500).json({ message: "Payment service unavailable" });
      }

      const bIdShort = String(bundle._id).slice(-6);
      const uIdShort = String(userId).slice(-6);

      const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `b_${bIdShort}_u_${uIdShort}`,
      });

      return res.json({
        success: true,
        order,
        key: process.env.RAZORPAY_KEY_ID,
      });

    } catch (error: any) {
      console.error("createOrder CRASH:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Internal Server Error",
      });
    }
  }

  static async verifyPayment(req: AuthRequest, res: Response) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        bundleId,
      } = req.body;

      const userId = req.user?.id;
      const userRole = req.user?.role;

      console.log("verifyPayment - Request body:", {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature: razorpay_signature ? "[REDACTED]" : undefined,
        bundleId,
      });
      console.log("verifyPayment - user:", { userId, userRole });

      if (!userId) {
        console.warn("verifyPayment - Unauthorized: missing userId");
        return res.status(401).json({ message: "Unauthorized" });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex");

      console.log("verifyPayment - expectedSignature:", expectedSignature);

      if (expectedSignature !== razorpay_signature) {
        console.warn("verifyPayment - signature mismatch", {
          expected: expectedSignature,
          received: razorpay_signature,
        });
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      const alreadyPaid = await Subscription.findOne({
        razorpayPaymentId: razorpay_payment_id,
      });

      if (alreadyPaid) {
        console.log("verifyPayment - already processed payment found", alreadyPaid._id);
        return res.json({
          success: true,
          message: "Payment already processed",
        });
      }

      const bundle = await BadgeBundle.findById(bundleId);
      console.log("verifyPayment - bundle found:", bundleId, !!bundle);
      if (!bundle) {
        console.error("verifyPayment - Bundle not found", bundleId);
        return res.status(404).json({ message: "Bundle not found" });
      }

      const allowedRoles = bundle.userTypes as UserType[];
      // Check if user's role matches any of the bundle's userTypes
      // if (!userRole || !bundle.userTypes.includes(userRole as any)) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        console.warn("verifyPayment - user role not eligible", { userRole, allowed: bundle.userTypes });
        return res.status(403).json({
          message: "Your role is not eligible for this bundle",
          allowedRoles: bundle.userTypes,
          userRole,
        });
      }

      if (!bundle.fee || bundle.fee === 0) {
        console.log("verifyPayment - free plan, no verification required", bundleId);
        return res.status(400).json({
          message: "Verification not required for free plans",
        });
      }

      const nextBillingDate = new Date();
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);

      const createPayload = {
        user: userId,
        bundle: bundleId,
        amount: bundle.fee,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        startDate: new Date(),
        nextBillingDate,
        status: "active",
      };

      console.log("verifyPayment - creating subscription with:", createPayload);
      const created = await Subscription.create(createPayload);
      console.log("verifyPayment - subscription created:", created._id);

      return res.json({
        success: true,
        message: "Payment successful & subscription activated",
      });
    } catch (err: any) {
      console.error("verifyPayment error:", err?.message || err, err?.stack || "");
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
}

