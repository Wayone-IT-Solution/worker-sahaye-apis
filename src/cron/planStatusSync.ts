import { EnrolledPlan, PlanEnrollmentStatus } from "../modals/enrollplan.model";
import { User } from "../modals/user.model";
import { SubscriptionPlan, PlanType } from "../modals/subscriptionplan.model";

/**
 * Cron job to sync hasPremiumPlan status across all users
 * This ensures that:
 * 1. Users with active non-free plans have hasPremiumPlan = true
 * 2. Users without any active plan have hasPremiumPlan = false
 * 3. Expired plans are automatically marked as EXPIRED
 */
export const syncPlanStatus = async () => {
  try {
    console.log("🔄 Starting plan status sync cron job...");

    // Step 1: Mark expired enrollments as EXPIRED
    const now = new Date();
    const expiredEnrollments = await EnrolledPlan.updateMany(
      {
        status: PlanEnrollmentStatus.ACTIVE,
        expiredAt: { $lt: now },
      },
      {
        status: PlanEnrollmentStatus.EXPIRED,
      }
    );

    if (expiredEnrollments.modifiedCount > 0) {
      console.log(
        `✅ Marked ${expiredEnrollments.modifiedCount} enrollments as EXPIRED`
      );
    }

    // Step 2: Get all users
    const allUsers = await User.find({}).select("_id hasPremiumPlan");
    console.log(`📊 Processing ${allUsers.length} users...`);

    let updated = 0;

    // Step 3: For each user, check their active enrollment status
    for (const user of allUsers) {
      // Find highest priority active enrollment
      const { UserSubscriptionService } = require("../services/userSubscription.service");
      const enrollment = await UserSubscriptionService.getHighestPriorityPlan(user._id);

      let shouldHavePremium = false;

      if (enrollment) {
        const plan = enrollment.plan as any;
        // Only set to true if plan exists and is NOT FREE
        if (plan && plan.planType !== PlanType.FREE) {
          shouldHavePremium = true;
        }
      }

      // Update if status doesn't match
      if (user.hasPremiumPlan !== shouldHavePremium) {
        await User.findByIdAndUpdate(user._id, {
          hasPremiumPlan: shouldHavePremium,
        });
        updated++;
        console.log(
          `  → User ${user._id}: hasPremiumPlan = ${shouldHavePremium}`
        );
      }
    }

    console.log(`✅ Plan status sync completed. Updated ${updated} users.`);
  } catch (error) {
    console.error("❌ Error in plan status sync cron job:", error);
    throw error;
  }
};
