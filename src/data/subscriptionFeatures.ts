/**
 * Subscription Plan Feature Comparison Guide
 * 
 * This file documents all features across subscription tiers:
 * FREE | BASIC | GROWTH | ENTERPRISE
 */

export const PLAN_FEATURES_MATRIX = {
    "🔍 SEARCH & CONTACT": {
        "Search Employer Jobs": {
            FREE: "Blurred (20 views/month)",
            BASIC: "Standard (100 views/month)",
            GROWTH: "Standard (500 views/month)",
            ENTERPRISE: "Priority (Unlimited)",
        },
        "Save Employer Jobs": {
            FREE: "❌ No",
            BASIC: "✓ 50",
            GROWTH: "✓ 200",
            ENTERPRISE: "✓ Unlimited",
        },
        "Apply to Employer Jobs": {
            FREE: "❌ No",
            BASIC: "✓ 10/month",
            GROWTH: "✓ 50/month",
            ENTERPRISE: "✓ Unlimited",
        },
        "Priority Apply": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ Yes",
            ENTERPRISE: "✓✓ Yes",
        },
        "Apply Visibility": {
            FREE: "❌ No",
            BASIC: "Standard",
            GROWTH: "Highlighted",
            ENTERPRISE: "Featured",
        },
    },

    "📞 AGENCY CONTACTS": {
        "View Employer Contact": {
            FREE: "❌ No",
            BASIC: "✓ 10/month",
            GROWTH: "✓ 60/month",
            ENTERPRISE: "✓ Unlimited",
        },
        "Call/WhatsApp Employer": {
            FREE: "❌ No",
            BASIC: "✓ Included",
            GROWTH: "✓ Included",
            ENTERPRISE: "✓ Unlimited",
        },
        "Search Candidates": {
            FREE: "❌ No",
            BASIC: "Limited",
            GROWTH: "Full",
            ENTERPRISE: "Unlimited",
        },
        "Candidate Profile Views": {
            FREE: "❌ No",
            BASIC: "✓ 100/month",
            GROWTH: "✓ 500/month",
            ENTERPRISE: "✓ Unlimited",
        },
        "Save Candidates": {
            FREE: "❌ No",
            BASIC: "✓ 50",
            GROWTH: "✓ 200",
            ENTERPRISE: "✓ Unlimited",
        },
        "Candidate Contact Unlocks": {
            FREE: "❌ No",
            BASIC: "✓ 30/month",
            GROWTH: "✓ 120/month",
            ENTERPRISE: "✓ Unlimited",
        },
    },

    "💼 JOB POSTING (HIRE CANDIDATES)": {
        "Post Job for Candidates": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ 5/month",
            ENTERPRISE: "✓ Unlimited",
        },
        "Job Visibility": {
            FREE: "❌ N/A",
            BASIC: "❌ N/A",
            GROWTH: "Standard",
            ENTERPRISE: "Priority",
        },
        "Free Job Boosts": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ 3/month",
            ENTERPRISE: "✓ Included",
        },
        "Paid Job Boost Option": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ Yes",
            ENTERPRISE: "✓ Yes",
        },
        "Save Job Drafts": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ 20",
            ENTERPRISE: "✓ Unlimited",
        },
        "Receive Applications": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ Yes",
            ENTERPRISE: "✓ Yes",
        },
        "Filter Applications": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "Basic",
            ENTERPRISE: "Advanced",
        },
        "Invite Candidates": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ 50/month",
            ENTERPRISE: "✓ Unlimited",
        },
    },

    "🏢 JOB POSTING FOR AGENCIES (B2B)": {
        "Post Job for Other Agencies": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ 2/month",
            ENTERPRISE: "✓ Unlimited",
        },
        "Job Visibility to Agencies": {
            FREE: "❌ N/A",
            BASIC: "❌ N/A",
            GROWTH: "Standard",
            ENTERPRISE: "Priority",
        },
        "Free Job Boosts (Agencies)": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ 1/month",
            ENTERPRISE: "✓ Included",
        },
        "Invite Agencies": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ 20/month",
            ENTERPRISE: "✓ Unlimited",
        },
        "Agency Contact Unlocks": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ 40/month",
            ENTERPRISE: "✓ Unlimited",
        },
    },

    "🧠 SMART HIRING": {
        "Pre-Interviewed Candidates": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ 1/month",
            ENTERPRISE: "✓ Included",
        },
        "Pre-Screened Employers": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "💰 Paid unlock",
            ENTERPRISE: "✓ Included",
        },
        "Support Level": {
            FREE: "—",
            BASIC: "—",
            GROWTH: "Priority Chat",
            ENTERPRISE: "SLA + Review Call",
        },
    },

    "📅 COMPLIANCE & COMMUNITY": {
        "Compliance Calendar": {
            FREE: "View only",
            BASIC: "Checklist",
            GROWTH: "Alerts",
            ENTERPRISE: "Compliance Pro",
        },
        "Community – View": {
            FREE: "✓ Yes",
            BASIC: "✓ Yes",
            GROWTH: "✓ Yes",
            ENTERPRISE: "✓ Yes",
        },
        "Community – Post": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ Yes",
            ENTERPRISE: "✓ Yes",
        },
        "Community – Connect": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "✓ Yes",
            ENTERPRISE: "✓ Yes",
        },
        "Endorsements": {
            FREE: "❌ No",
            BASIC: "❌ No",
            GROWTH: "❌ No",
            ENTERPRISE: "✓ Yes",
        },
    },
};

/**
 * Get feature value for a specific plan and feature category
 */
export const getFeatureValue = (category: string, feature: string, plan: "FREE" | "BASIC" | "GROWTH" | "ENTERPRISE") => {
    const categoryData = PLAN_FEATURES_MATRIX[category as keyof typeof PLAN_FEATURES_MATRIX];
    return categoryData?.[feature as keyof typeof categoryData]?.[plan];
};

/**
 * Check if a feature is available in a plan
 */
export const isFeatureAvailable = (category: string, feature: string, plan: "FREE" | "BASIC" | "GROWTH" | "ENTERPRISE"): boolean => {
    const value = getFeatureValue(category, feature, plan);
    return value !== "❌ No" && value !== "❌ N/A" && value !== "—" && value !== undefined;
};

/**
 * Get all plans sorted by tier
 */
export const planTiers = ["FREE", "BASIC", "GROWTH", "ENTERPRISE"] as const;

/**
 * Feature categories
 */
export const featureCategories = [
    "🔍 SEARCH & CONTACT",
    "📞 AGENCY CONTACTS",
    "💼 JOB POSTING (HIRE CANDIDATES)",
    "🏢 JOB POSTING FOR AGENCIES (B2B)",
    "🧠 SMART HIRING",
    "📅 COMPLIANCE & COMMUNITY",
] as const;
