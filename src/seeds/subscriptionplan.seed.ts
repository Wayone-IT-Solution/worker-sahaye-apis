import { SubscriptionPlan, PlanType, UserType, BillingCycle, PlanStatus } from "../modals/subscriptionplan.model";

/**
 * Subscription Plan Seed Data
 * Based on feature matrix:
 * - FREE (Registration only, limited features)
 * - BASIC (Entry level, limited features)
 * - GROWTH (Advanced features, good limits)
 * - ENTERPRISE (Full features, unlimited access)
 */

const subscriptionPlanSeeds = [
    // ==================== FREE PLANS ====================
    {
        name: "Contractor Free Plan",
        displayName: "Free",
        description: "Registration-only plan for contractors to explore the platform",
        tagline: "Get Started",
        planType: PlanType.FREE,
        userType: UserType.CONTRACTOR,
        basePrice: 0,
        currency: "INR",
        billingCycle: BillingCycle.MONTHLY,
        status: PlanStatus.ACTIVE,
        priority: 1,
        isPopular: false,
        isRecommended: false,
        contractorFeatures: {
            searchAndContact: {
                searchEmployerJobs: {
                    enabled: true,
                    mode: "blurred", // Blurred view only
                },
                employerJobViewsPerMonth: {
                    enabled: true,
                    limit: 20, // 20 blurred views per month
                    unlimited: false,
                },
                saveEmployerJobs: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                applyToEmployerJobs: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                priorityApply: false,
                applyVisibility: {
                    enabled: false,
                    mode: undefined,
                },
                viewEmployerContact: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                callOrWhatsappEmployer: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                searchCandidates: {
                    enabled: false,
                    mode: undefined,
                },
                candidateProfileViews: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                saveCandidates: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                candidateContactUnlocks: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
            },
            jobPostingCandidates: {
                postJob: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                jobVisibility: {
                    enabled: false,
                    mode: undefined,
                },
                freeJobBoosts: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                paidJobBoostOption: false,
                saveJobDrafts: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                receiveApplications: false,
                filterApplications: {
                    enabled: false,
                    level: undefined,
                },
                inviteCandidates: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                candidateContactUnlocks: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
            },
            jobPostingAgencies: {
                postJob: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                jobVisibility: {
                    enabled: false,
                    mode: undefined,
                },
                freeJobBoosts: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                paidJobBoostOption: false,
                saveJobDrafts: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                receiveApplications: false,
                filterApplications: {
                    enabled: false,
                    level: undefined,
                },
                inviteAgencies: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                agencyContactUnlocks: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
            },
            smartHiring: {
                preInterviewedCandidates: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                preScreenedEmployers: {
                    enabled: false,
                    unlockType: undefined,
                },
                supportLevel: "none",
            },
            complianceAndCommunity: {
                complianceCalendar: {
                    enabled: true,
                    level: "view", // View only
                },
                communityView: true,
                communityPost: false,
                communityConnect: false,
                endorsements: false,
            },
            serviceOnlyFeatures: {
                bulkHiring: {
                    visible: false,
                    access: "view_only",
                },
                projectBasedHiring: {
                    visible: false,
                    access: "view_only",
                },
                onDemandWorkerAllocation: {
                    visible: false,
                    access: "view_only",
                },
            },
            premiumServicesDiscounts: {
                brandingSupport: 0,
                virtualHR: 0,
                virtualRecruiter: 0,
                exclusiveProjects: 0,
                prioritySupport: false,
            },
        },
    },

    // ==================== BASIC PLANS ====================
    {
        name: "Contractor Basic Plan",
        displayName: "Basic",
        description: "Essential plan with limited job applications and candidate access",
        tagline: "Most Popular for Starters",
        planType: PlanType.BASIC,
        userType: UserType.CONTRACTOR,
        basePrice: 999,
        currency: "INR",
        billingCycle: BillingCycle.MONTHLY,
        status: PlanStatus.ACTIVE,
        priority: 2,
        isPopular: true,
        isRecommended: false,
        contractorFeatures: {
            searchAndContact: {
                searchEmployerJobs: {
                    enabled: true,
                    mode: "standard",
                },
                employerJobViewsPerMonth: {
                    enabled: true,
                    limit: 100,
                    unlimited: false,
                },
                saveEmployerJobs: {
                    enabled: true,
                    limit: 50,
                    unlimited: false,
                },
                applyToEmployerJobs: {
                    enabled: true,
                    limit: 10, // 10 per month
                    unlimited: false,
                },
                priorityApply: false,
                applyVisibility: {
                    enabled: true,
                    mode: "standard",
                },
                viewEmployerContact: {
                    enabled: true,
                    limit: 10, // 10 per month
                    unlimited: false,
                },
                callOrWhatsappEmployer: {
                    enabled: true,
                    limit: null, // Included
                    unlimited: true,
                },
                searchCandidates: {
                    enabled: true,
                    mode: "limited",
                },
                candidateProfileViews: {
                    enabled: true,
                    limit: 100, // 100 per month
                    unlimited: false,
                },
                saveCandidates: {
                    enabled: true,
                    limit: 50,
                    unlimited: false,
                },
                candidateContactUnlocks: {
                    enabled: true,
                    limit: 30, // 30 per month
                    unlimited: false,
                },
            },
            jobPostingCandidates: {
                postJob: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                jobVisibility: {
                    enabled: false,
                    mode: undefined,
                },
                freeJobBoosts: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                paidJobBoostOption: false,
                saveJobDrafts: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                receiveApplications: false,
                filterApplications: {
                    enabled: false,
                    level: undefined,
                },
                inviteCandidates: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                candidateContactUnlocks: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
            },
            jobPostingAgencies: {
                postJob: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                jobVisibility: {
                    enabled: false,
                    mode: undefined,
                },
                freeJobBoosts: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                paidJobBoostOption: false,
                saveJobDrafts: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                receiveApplications: false,
                filterApplications: {
                    enabled: false,
                    level: undefined,
                },
                inviteAgencies: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                agencyContactUnlocks: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
            },
            smartHiring: {
                preInterviewedCandidates: {
                    enabled: false,
                    limit: null,
                    unlimited: false,
                },
                preScreenedEmployers: {
                    enabled: false,
                    unlockType: undefined,
                },
                supportLevel: "none",
            },
            complianceAndCommunity: {
                complianceCalendar: {
                    enabled: true,
                    level: "checklist",
                },
                communityView: true,
                communityPost: false,
                communityConnect: false,
                endorsements: false,
            },
            serviceOnlyFeatures: {
                bulkHiring: {
                    visible: false,
                    access: "view_only",
                },
                projectBasedHiring: {
                    visible: false,
                    access: "view_only",
                },
                onDemandWorkerAllocation: {
                    visible: false,
                    access: "view_only",
                },
            },
            premiumServicesDiscounts: {
                brandingSupport: 0,
                virtualHR: 0,
                virtualRecruiter: 0,
                exclusiveProjects: 0,
                prioritySupport: false,
            },
        },
    },

    // ==================== GROWTH PLANS ====================
    {
        name: "Contractor Growth Plan",
        displayName: "Growth",
        description: "Advanced plan with job posting and extensive candidate access",
        tagline: "Best for Active Hiring",
        planType: PlanType.GROWTH,
        userType: UserType.CONTRACTOR,
        basePrice: 2999,
        currency: "INR",
        billingCycle: BillingCycle.MONTHLY,
        status: PlanStatus.ACTIVE,
        priority: 3,
        isPopular: false,
        isRecommended: true,
        contractorFeatures: {
            searchAndContact: {
                searchEmployerJobs: {
                    enabled: true,
                    mode: "standard",
                },
                employerJobViewsPerMonth: {
                    enabled: true,
                    limit: 500,
                    unlimited: false,
                },
                saveEmployerJobs: {
                    enabled: true,
                    limit: 200,
                    unlimited: false,
                },
                applyToEmployerJobs: {
                    enabled: true,
                    limit: 50, // 50 per month
                    unlimited: false,
                },
                priorityApply: true,
                applyVisibility: {
                    enabled: true,
                    mode: "highlighted",
                },
                viewEmployerContact: {
                    enabled: true,
                    limit: 60, // 60 per month
                    unlimited: false,
                },
                callOrWhatsappEmployer: {
                    enabled: true,
                    limit: null, // Included
                    unlimited: true,
                },
                searchCandidates: {
                    enabled: true,
                    mode: "full",
                },
                candidateProfileViews: {
                    enabled: true,
                    limit: 500, // 500 per month
                    unlimited: false,
                },
                saveCandidates: {
                    enabled: true,
                    limit: 200,
                    unlimited: false,
                },
                candidateContactUnlocks: {
                    enabled: true,
                    limit: 120, // 120 per month
                    unlimited: false,
                },
            },
            jobPostingCandidates: {
                postJob: {
                    enabled: true,
                    limit: 5, // 5 per month
                    unlimited: false,
                },
                jobVisibility: {
                    enabled: true,
                    mode: "standard",
                },
                freeJobBoosts: {
                    enabled: true,
                    limit: 3, // 3 per month
                    unlimited: false,
                },
                paidJobBoostOption: true,
                saveJobDrafts: {
                    enabled: true,
                    limit: 20,
                    unlimited: false,
                },
                receiveApplications: true,
                filterApplications: {
                    enabled: true,
                    level: "basic",
                },
                inviteCandidates: {
                    enabled: true,
                    limit: 50, // 50 per month
                    unlimited: false,
                },
                candidateContactUnlocks: {
                    enabled: true,
                    limit: 120, // 120 per month
                    unlimited: false,
                },
            },
            jobPostingAgencies: {
                postJob: {
                    enabled: true,
                    limit: 2, // 2 per month
                    unlimited: false,
                },
                jobVisibility: {
                    enabled: true,
                    mode: "standard",
                },
                freeJobBoosts: {
                    enabled: true,
                    limit: 1, // 1 per month
                    unlimited: false,
                },
                paidJobBoostOption: true,
                saveJobDrafts: {
                    enabled: true,
                    limit: 10,
                    unlimited: false,
                },
                receiveApplications: true,
                filterApplications: {
                    enabled: true,
                    level: "basic",
                },
                inviteAgencies: {
                    enabled: true,
                    limit: 20, // 20 per month
                    unlimited: false,
                },
                agencyContactUnlocks: {
                    enabled: true,
                    limit: 40, // 40 per month
                    unlimited: false,
                },
            },
            smartHiring: {
                preInterviewedCandidates: {
                    enabled: true,
                    limit: 1, // 1 per month free
                    unlimited: false,
                },
                preScreenedEmployers: {
                    enabled: true,
                    unlockType: "paid",
                },
                supportLevel: "priority_chat",
            },
            complianceAndCommunity: {
                complianceCalendar: {
                    enabled: true,
                    level: "alerts",
                },
                communityView: true,
                communityPost: true,
                communityConnect: true,
                endorsements: false,
            },
            serviceOnlyFeatures: {
                bulkHiring: {
                    visible: true,
                    access: "service_request",
                },
                projectBasedHiring: {
                    visible: true,
                    access: "service_request",
                },
                onDemandWorkerAllocation: {
                    visible: true,
                    access: "service_request",
                },
            },
            premiumServicesDiscounts: {
                brandingSupport: 10,
                virtualHR: 10,
                virtualRecruiter: 10,
                exclusiveProjects: 5,
                prioritySupport: false,
            },
        },
    },

    // ==================== ENTERPRISE PLANS ====================
    {
        name: "Contractor Enterprise Plan",
        displayName: "Enterprise",
        description: "Premium plan with unlimited access to all features",
        tagline: "Premium All-Access",
        planType: PlanType.ENTERPRISE,
        userType: UserType.CONTRACTOR,
        basePrice: 7999,
        currency: "INR",
        billingCycle: BillingCycle.MONTHLY,
        status: PlanStatus.ACTIVE,
        priority: 4,
        isPopular: false,
        isRecommended: false,
        contractorFeatures: {
            searchAndContact: {
                searchEmployerJobs: {
                    enabled: true,
                    mode: "priority",
                },
                employerJobViewsPerMonth: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                saveEmployerJobs: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                applyToEmployerJobs: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                priorityApply: true,
                applyVisibility: {
                    enabled: true,
                    mode: "featured",
                },
                viewEmployerContact: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                callOrWhatsappEmployer: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                searchCandidates: {
                    enabled: true,
                    mode: "full",
                },
                candidateProfileViews: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                saveCandidates: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                candidateContactUnlocks: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
            },
            jobPostingCandidates: {
                postJob: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                jobVisibility: {
                    enabled: true,
                    mode: "priority",
                },
                freeJobBoosts: {
                    enabled: true,
                    limit: null, // Included
                    unlimited: true,
                },
                paidJobBoostOption: true,
                saveJobDrafts: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                receiveApplications: true,
                filterApplications: {
                    enabled: true,
                    level: "advanced",
                },
                inviteCandidates: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                candidateContactUnlocks: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
            },
            jobPostingAgencies: {
                postJob: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                jobVisibility: {
                    enabled: true,
                    mode: "priority",
                },
                freeJobBoosts: {
                    enabled: true,
                    limit: null, // Included
                    unlimited: true,
                },
                paidJobBoostOption: true,
                saveJobDrafts: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                receiveApplications: true,
                filterApplications: {
                    enabled: true,
                    level: "advanced",
                },
                inviteAgencies: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
                agencyContactUnlocks: {
                    enabled: true,
                    limit: null, // Unlimited
                    unlimited: true,
                },
            },
            smartHiring: {
                preInterviewedCandidates: {
                    enabled: true,
                    limit: null, // Included
                    unlimited: true,
                },
                preScreenedEmployers: {
                    enabled: true,
                    unlockType: "included",
                },
                supportLevel: "sla_review_call",
            },
            complianceAndCommunity: {
                complianceCalendar: {
                    enabled: true,
                    level: "pro",
                },
                communityView: true,
                communityPost: true,
                communityConnect: true,
                endorsements: true,
            },
            serviceOnlyFeatures: {
                bulkHiring: {
                    visible: true,
                    access: "service_request",
                },
                projectBasedHiring: {
                    visible: true,
                    access: "service_request",
                },
                onDemandWorkerAllocation: {
                    visible: true,
                    access: "service_request",
                },
            },
            premiumServicesDiscounts: {
                brandingSupport: 25,
                virtualHR: 25,
                virtualRecruiter: 25,
                exclusiveProjects: 15,
                prioritySupport: true,
            },
        },
    },
];

export default subscriptionPlanSeeds;
