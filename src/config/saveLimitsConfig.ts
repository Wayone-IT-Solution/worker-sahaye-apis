/**
 * Save Limits Configuration by Plan Type and User Type
 * This file documents the planned save limits structure
 */

export const SAVE_LIMITS_CONFIG = {
  employer: {
    free: {
      totalSavesLimit: 10,
      saveProfilesLimit: 5,
      saveJobsLimit: 5,
      saveDraftsLimit: 0,
    },
    basic: {
      totalSavesLimit: 25,
      saveProfilesLimit: 15,
      saveJobsLimit: 10,
      saveDraftsLimit: 5,
    },
    growth: {
      totalSavesLimit: 50,
      saveProfilesLimit: 30,
      saveJobsLimit: 15,
      saveDraftsLimit: 10,
    },
    enterprise: {
      totalSavesLimit: null, // Unlimited
      saveProfilesLimit: null,
      saveJobsLimit: null,
      saveDraftsLimit: null,
    },
  },
  contractor: {
    free: {
      totalSavesLimit: 0, // Not available
      saveProfilesLimit: 0,
      saveJobsLimit: 0,
      saveDraftsLimit: 0,
    },
    basic: {
      totalSavesLimit: 20,
      saveProfilesLimit: 10,
      saveJobsLimit: 8,
      saveDraftsLimit: 2,
    },
    growth: {
      totalSavesLimit: 40,
      saveProfilesLimit: 20,
      saveJobsLimit: 15,
      saveDraftsLimit: 5,
    },
    enterprise: {
      totalSavesLimit: null, // Unlimited
      saveProfilesLimit: null,
      saveJobsLimit: null,
      saveDraftsLimit: null,
    },
  },
  worker: {
    free: {
      totalSavesLimit: null, // Unlimited - workers are not gated
      saveProfilesLimit: null,
      saveJobsLimit: null,
      saveDraftsLimit: null,
    },
    basic: {
      totalSavesLimit: null, // Unlimited
      saveProfilesLimit: null,
      saveJobsLimit: null,
      saveDraftsLimit: null,
    },
    growth: {
      totalSavesLimit: null, // Unlimited
      saveProfilesLimit: null,
      saveJobsLimit: null,
      saveDraftsLimit: null,
    },
    enterprise: {
      totalSavesLimit: null, // Unlimited
      saveProfilesLimit: null,
      saveJobsLimit: null,
      saveDraftsLimit: null,
    },
  },
};

/**
 * NOTE: To apply these limits to the database, run a migration:
 *
 * Example Update Query:
 *
 * // Employer FREE Plan
 * db.subscriptionplans.updateOne(
 *   { userType: "employer", planType: "free" },
 *   {
 *     $set: {
 *       totalSavesLimit: 10,
 *       saveProfilesLimit: 5,
 *       saveJobsLimit: 5,
 *       saveDraftsLimit: 0
 *     }
 *   }
 * )
 *
 * // Employer BASIC Plan
 * db.subscriptionplans.updateOne(
 *   { userType: "employer", planType: "basic" },
 *   {
 *     $set: {
 *       totalSavesLimit: 25,
 *       saveProfilesLimit: 15,
 *       saveJobsLimit: 10,
 *       saveDraftsLimit: 5
 *     }
 *   }
 * )
 *
 * // Employer GROWTH Plan
 * db.subscriptionplans.updateOne(
 *   { userType: "employer", planType: "growth" },
 *   {
 *     $set: {
 *       totalSavesLimit: 50,
 *       saveProfilesLimit: 30,
 *       saveJobsLimit: 15,
 *       saveDraftsLimit: 10
 *     }
 *   }
 * )
 *
 * // Employer ENTERPRISE Plan
 * db.subscriptionplans.updateOne(
 *   { userType: "employer", planType: "enterprise" },
 *   {
 *     $set: {
 *       totalSavesLimit: null,
 *       saveProfilesLimit: null,
 *       saveJobsLimit: null,
 *       saveDraftsLimit: null
 *     }
 *   }
 * )
 *
 * // Contractor BASIC Plan
 * db.subscriptionplans.updateOne(
 *   { userType: "contractor", planType: "basic" },
 *   {
 *     $set: {
 *       totalSavesLimit: 20,
 *       saveProfilesLimit: 10,
 *       saveJobsLimit: 8,
 *       saveDraftsLimit: 2
 *     }
 *   }
 * )
 *
 * // Contractor GROWTH Plan
 * db.subscriptionplans.updateOne(
 *   { userType: "contractor", planType: "growth" },
 *   {
 *     $set: {
 *       totalSavesLimit: 40,
 *       saveProfilesLimit: 20,
 *       saveJobsLimit: 15,
 *       saveDraftsLimit: 5
 *     }
 *   }
 * )
 *
 * // Contractor ENTERPRISE Plan
 * db.subscriptionplans.updateOne(
 *   { userType: "contractor", planType: "enterprise" },
 *   {
 *     $set: {
 *       totalSavesLimit: null,
 *       saveProfilesLimit: null,
 *       saveJobsLimit: null,
 *       saveDraftsLimit: null
 *     }
 *   }
 * )
 */
