import { ISubscriptionPlan } from "../modals/subscriptionplan.model";

/**
 * Subscription Plan Feature Service
 * Provides utility methods for checking and managing subscription plan features
 */

export class SubscriptionPlanFeatureService {
    /**
     * Check if contractor has access to search employer jobs
     */
    static canSearchEmployerJobs(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.searchAndContact?.searchEmployerJobs?.enabled || false;
    }

    /**
     * Check if contractor can apply to employer jobs
     */
    static canApplyToEmployerJobs(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.searchAndContact?.applyToEmployerJobs?.enabled || false;
    }

    /**
     * Check if contractor can post jobs
     */
    static canPostJobs(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.jobPostingCandidates?.postJob?.enabled || false;
    }

    /**
     * Check if contractor can receive job applications
     */
    static canReceiveApplications(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.jobPostingCandidates?.receiveApplications || false;
    }

    /**
     * Check if contractor can access candidate profiles
     */
    static canSearchCandidates(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.searchAndContact?.searchCandidates?.enabled || false;
    }

    /**
     * Check if contractor can view employer contacts
     */
    static canViewEmployerContact(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.searchAndContact?.viewEmployerContact?.enabled || false;
    }

    /**
     * Check if contractor can access community features
     */
    static canAccessCommunity(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.complianceAndCommunity?.communityView || false;
    }

    /**
     * Check if contractor can post in community
     */
    static canPostInCommunity(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.complianceAndCommunity?.communityPost || false;
    }

    /**
     * Check if contractor can connect with community members
     */
    static canCommunityConnect(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.complianceAndCommunity?.communityConnect || false;
    }

    /**
     * Get monthly view limit for employer jobs
     */
    static getEmployerJobViewLimit(plan: ISubscriptionPlan): number | null {
        const limit = plan.contractorFeatures?.searchAndContact?.employerJobViewsPerMonth?.limit;
        if (plan.contractorFeatures?.searchAndContact?.employerJobViewsPerMonth?.unlimited) {
            return null; // null represents unlimited
        }
        return limit || 0;
    }

    /**
     * Get monthly application limit to employer jobs
     */
    static getApplyToJobsLimit(plan: ISubscriptionPlan): number | null {
        const limit = plan.contractorFeatures?.searchAndContact?.applyToEmployerJobs?.limit;
        if (plan.contractorFeatures?.searchAndContact?.applyToEmployerJobs?.unlimited) {
            return null;
        }
        return limit || 0;
    }

    /**
     * Get monthly job posting limit
     */
    static getJobPostingLimit(plan: ISubscriptionPlan): number | null {
        const limit = plan.contractorFeatures?.jobPostingCandidates?.postJob?.limit;
        if (plan.contractorFeatures?.jobPostingCandidates?.postJob?.unlimited) {
            return null;
        }
        return limit || 0;
    }

    /**
     * Get monthly candidate profile view limit
     */
    static getCandidateViewLimit(plan: ISubscriptionPlan): number | null {
        const limit = plan.contractorFeatures?.searchAndContact?.candidateProfileViews?.limit;
        if (plan.contractorFeatures?.searchAndContact?.candidateProfileViews?.unlimited) {
            return null;
        }
        return limit || 0;
    }

    /**
     * Get monthly candidate contact unlock limit
     */
    static getCandidateContactUnlockLimit(plan: ISubscriptionPlan): number | null {
        const limit = plan.contractorFeatures?.searchAndContact?.candidateContactUnlocks?.limit;
        if (plan.contractorFeatures?.searchAndContact?.candidateContactUnlocks?.unlimited) {
            return null;
        }
        return limit || 0;
    }

    /**
     * Get application filter level
     */
    static getApplicationFilterLevel(plan: ISubscriptionPlan): "basic" | "advanced" | null {
        if (!plan.contractorFeatures?.jobPostingCandidates?.filterApplications?.enabled) {
            return null;
        }
        return plan.contractorFeatures.jobPostingCandidates.filterApplications.level as "basic" | "advanced";
    }

    /**
     * Get job visibility mode
     */
    static getJobVisibilityMode(plan: ISubscriptionPlan): string | null {
        if (!plan.contractorFeatures?.jobPostingCandidates?.jobVisibility?.enabled) {
            return null;
        }
        return plan.contractorFeatures.jobPostingCandidates.jobVisibility.mode || null;
    }

    /**
     * Check if contractor has priority apply
     */
    static hasPriorityApply(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.searchAndContact?.priorityApply || false;
    }

    /**
     * Get compliance calendar level
     */
    static getComplianceCalendarLevel(plan: ISubscriptionPlan): "view" | "checklist" | "alerts" | "pro" | null {
        if (!plan.contractorFeatures?.complianceAndCommunity?.complianceCalendar?.enabled) {
            return null;
        }
        return plan.contractorFeatures.complianceAndCommunity.complianceCalendar.level as any;
    }

    /**
     * Check if contractor can use smart hiring features
     */
    static hasSmartHiring(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.smartHiring?.preInterviewedCandidates?.enabled || false;
    }

    /**
     * Get support level for this plan
     */
    static getSupportLevel(plan: ISubscriptionPlan): string {
        return plan.contractorFeatures?.smartHiring?.supportLevel || "none";
    }

    /**
     * Check if contractor can use paid job boost option
     */
    static canUsePaidJobBoost(plan: ISubscriptionPlan): boolean {
        return plan.contractorFeatures?.jobPostingCandidates?.paidJobBoostOption || false;
    }

    /**
     * Get free job boosts per month
     */
    static getFreeJobBoostsLimit(plan: ISubscriptionPlan): number | null {
        const limit = plan.contractorFeatures?.jobPostingCandidates?.freeJobBoosts?.limit;
        if (plan.contractorFeatures?.jobPostingCandidates?.freeJobBoosts?.unlimited) {
            return null; // Unlimited
        }
        return limit || 0;
    }

    /**
     * Get search candidate mode
     */
    static getSearchCandidateMode(plan: ISubscriptionPlan): "limited" | "full" | "unlimited" | null {
        if (!plan.contractorFeatures?.searchAndContact?.searchCandidates?.enabled) {
            return null;
        }
        return plan.contractorFeatures.searchAndContact.searchCandidates.mode as any;
    }

    /**
     * Get save candidates limit
     */
    static getSaveCandidatesLimit(plan: ISubscriptionPlan): number | null {
        const limit = plan.contractorFeatures?.searchAndContact?.saveCandidates?.limit;
        if (plan.contractorFeatures?.searchAndContact?.saveCandidates?.unlimited) {
            return null;
        }
        return limit || 0;
    }

    /**
     * Get premium service discount percentage
     */
    static getPremiumServiceDiscount(plan: ISubscriptionPlan, service: "brandingSupport" | "virtualHR" | "virtualRecruiter" | "exclusiveProjects"): number {
        return plan.contractorFeatures?.premiumServicesDiscounts?.[service] || 0;
    }

    /**
     * Get all features summary for a plan (for display purposes)
     */
    static getFeaturesSummary(plan: ISubscriptionPlan) {
        return {
            canSearchEmployerJobs: this.canSearchEmployerJobs(plan),
            canApplyToEmployerJobs: this.canApplyToEmployerJobs(plan),
            canPostJobs: this.canPostJobs(plan),
            canReceiveApplications: this.canReceiveApplications(plan),
            canSearchCandidates: this.canSearchCandidates(plan),
            canViewEmployerContact: this.canViewEmployerContact(plan),
            canAccessCommunity: this.canAccessCommunity(plan),
            canPostInCommunity: this.canPostInCommunity(plan),
            hasPriorityApply: this.hasPriorityApply(plan),
            hasSmartHiring: this.hasSmartHiring(plan),
            employerJobViewLimit: this.getEmployerJobViewLimit(plan),
            applyToJobsLimit: this.getApplyToJobsLimit(plan),
            jobPostingLimit: this.getJobPostingLimit(plan),
            candidateViewLimit: this.getCandidateViewLimit(plan),
            complianceLevel: this.getComplianceCalendarLevel(plan),
            supportLevel: this.getSupportLevel(plan),
        };
    }
}
