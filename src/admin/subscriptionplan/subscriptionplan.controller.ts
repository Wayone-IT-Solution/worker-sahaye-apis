import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { SubscriptionPlan, PlanType, UserType, BillingCycle } from "../../modals/subscriptionplan.model";
import { uploadToS3 } from "../../config/s3Uploader";

const subscriptionPlanService = new CommonService(SubscriptionPlan);

// Helper function to get all benefits for a plan
const getPlanBenefits = (plan: any, userType: string): string[] => {
  const benefits: string[] = [];
  const UNLIMITED_THRESHOLD = 1000000; // Treat numbers above 1M as unlimited

  // Helper to check if a number represents unlimited
  const isUnlimited = (num: any): boolean => {
    const n = typeof num === 'string' ? Number(num) : num;
    return !isNaN(n) && n > UNLIMITED_THRESHOLD;
  };

  // Add feature names from features array
  if (plan.features && Array.isArray(plan.features)) {
    plan.features.forEach((feature: any) => {
      if (feature.name) {
        benefits.push(feature.name);
      }
    });
  }

  // Add default benefits for all users
  benefits.push("Browse job listings");
  benefits.push("Create and manage profile");
  benefits.push("Apply for jobs");
  
  // Add plan-type specific default benefits
  if (plan.planType === PlanType.BASIC || plan.planType === PlanType.PREMIUM || 
      plan.planType === PlanType.GROWTH || plan.planType === PlanType.ENTERPRISE || 
      plan.planType === PlanType.PROFESSIONAL) {
    benefits.push("Email notifications");
    benefits.push("Job recommendations");
  }

  // Add benefits based on limits (for contractor/employer)
  if (userType === UserType.CONTRACTOR || userType === UserType.EMPLOYER) {
    if (plan.viewProfileLimit) {
      const limit = typeof plan.viewProfileLimit === 'object' ? plan.viewProfileLimit[userType] : plan.viewProfileLimit;
      if (limit && limit > 0) {
        if (isUnlimited(limit)) {
          benefits.push(`Unlimited profile viewing`);
        } else {
          benefits.push(`View up to ${limit.toLocaleString()} profiles/month`);
        }
      }
    }

    if (plan.contactUnlockLimit) {
      const limit = typeof plan.contactUnlockLimit === 'object' ? plan.contactUnlockLimit[userType] : plan.contactUnlockLimit;
      if (limit && limit > 0) {
        if (isUnlimited(limit)) {
          benefits.push(`Unlimited contact unlocking`);
        } else {
          benefits.push(`Unlock contact details of ${limit.toLocaleString()} candidates/month`);
        }
      }
    }

    if (plan.saveProfileLimit) {
      const limit = typeof plan.saveProfileLimit === 'object' ? plan.saveProfileLimit[userType] : plan.saveProfileLimit;
      if (limit && limit > 0) {
        if (isUnlimited(limit)) {
          benefits.push(`Unlimited profile saving`);
        } else {
          benefits.push(`Save up to ${limit.toLocaleString()} profiles/month`);
        }
      }
    }

    if (plan.inviteSendLimit) {
      const limit = typeof plan.inviteSendLimit === 'object' ? plan.inviteSendLimit[userType] : plan.inviteSendLimit;
      if (limit && limit > 0) {
        if (isUnlimited(limit)) {
          benefits.push(`Unlimited invitations`);
        } else {
          benefits.push(`Send ${limit.toLocaleString()} invitations/month`);
        }
      }
    }

    if (plan.jobViewPerMonth && plan.jobViewPerMonth > 0) {
      if (isUnlimited(plan.jobViewPerMonth)) {
        benefits.push(`Unlimited job viewing`);
      } else {
        benefits.push(`View up to ${plan.jobViewPerMonth.toLocaleString()} jobs/month`);
      }
    }

    if (plan.agencyJobPostLimits) {
      if (plan.agencyJobPostLimits.agency && plan.agencyJobPostLimits.agency > 0) {
        if (isUnlimited(plan.agencyJobPostLimits.agency)) {
          benefits.push(`Unlimited agency job listings`);
        } else {
          benefits.push(`Post ${plan.agencyJobPostLimits.agency} agency job listings`);
        }
      }
      if (plan.agencyJobPostLimits.customer && plan.agencyJobPostLimits.customer > 0) {
        if (isUnlimited(plan.agencyJobPostLimits.customer)) {
          benefits.push(`Unlimited customer job listings`);
        } else {
          benefits.push(`Post ${plan.agencyJobPostLimits.customer} customer job listings`);
        }
      }
    }

    if (plan.employerJobPostLimits) {
      if (plan.employerJobPostLimits.agency && plan.employerJobPostLimits.agency > 0) {
        if (isUnlimited(plan.employerJobPostLimits.agency)) {
          benefits.push(`Unlimited agency job listings`);
        } else {
          benefits.push(`Post ${plan.employerJobPostLimits.agency} agency job listings`);
        }
      }
      if (plan.employerJobPostLimits.candidate && plan.employerJobPostLimits.candidate > 0) {
        if (isUnlimited(plan.employerJobPostLimits.candidate)) {
          benefits.push(`Unlimited candidate job listings`);
        } else {
          benefits.push(`Post ${plan.employerJobPostLimits.candidate} candidate job listings`);
        }
      }
    }
  } else if (userType === UserType.WORKER) {
    // For workers
    if (plan.viewProfileLimit) {
      const limit = typeof plan.viewProfileLimit === 'object' ? plan.viewProfileLimit[userType] : plan.viewProfileLimit;
      if (limit && limit > 0) {
        if (isUnlimited(limit)) {
          benefits.push(`Unlimited profile viewing`);
        } else {
          benefits.push(`View up to ${limit.toLocaleString()} profiles/month`);
        }
      }
    }

    if (plan.saveProfileLimit) {
      const limit = typeof plan.saveProfileLimit === 'object' ? plan.saveProfileLimit[userType] : plan.saveProfileLimit;
      if (limit && limit > 0) {
        if (isUnlimited(limit)) {
          benefits.push(`Unlimited job saving`);
        } else {
          benefits.push(`Save up to ${limit.toLocaleString()} jobs/month`);
        }
      }
    }
  }

  return [...new Set(benefits)]; // Remove duplicates
};

// Helper function to generate whatYouGet and whatYouMiss based on plan features
const generatePlanBenefits = (plan: any, userType: string): { whatYouGet: string[]; whatYouMiss: string[] } => {
  const whatYouGet = getPlanBenefits(plan, userType);
  
  return {
    whatYouGet,
    whatYouMiss: plan.whatYouMiss || [],
  };
};

// Validation function for subscription plan data
const validateSubscriptionPlanData = (data: any) => {
  const errors: string[] = [];

  if (!data.name) errors.push("Plan name is required");
  if (!data.displayName) errors.push("Display name is required");
  if (!data.description) errors.push("Description is required");
  if (data.basePrice === undefined || data.basePrice < 0) errors.push("Valid base price is required");
  if (!data.planType || !Object.values(PlanType).includes(data.planType)) errors.push("Valid plan type is required");
  if (!data.userType || !Object.values(UserType).includes(data.userType)) errors.push("Valid user type is required");
  if (!data.billingCycle || !Object.values(BillingCycle).includes(data.billingCycle)) errors.push("Valid billing cycle is required");

  return errors;
};

export class SubscriptionplanController {
  static async createSubscriptionplan(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Parse JSON fields if they come as FormData strings
      let body = req.body;
      const jsonFields = [
        'agencyJobPostLimits',
        'employerJobPostLimits',
        'inviteSendLimit',
        'viewProfileLimit',
        'contactUnlockLimit',
        'saveProfileLimit',
        'features'
      ];

      // Parse stringified JSON fields
      jsonFields.forEach(field => {
        if (body[field] && typeof body[field] === 'string') {
          try {
            body[field] = JSON.parse(body[field]);
          } catch (e) {
            // If it fails to parse, keep original value
          }
        }
      });

      // Handle file upload if present
      if (req.file) {
        try {
          const imageUrl = await uploadToS3(
            req.file.buffer,
            req.file.originalname,
            "subscription-plans"
          );
          body.planImage = imageUrl;
        } catch (uploadError) {
          console.error("Error uploading image to S3:", uploadError);
          return res
            .status(400)
            .json(new ApiError(400, "Failed to upload plan image"));
        }
      }

      // Validate required fields
      const validationErrors = validateSubscriptionPlanData(body);
      if (validationErrors.length > 0) {
        return res
          .status(400)
          .json(new ApiError(400, validationErrors.join(", ")));
      }

      const result = await subscriptionPlanService.create(body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create subscription plan"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Subscription plan created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllSubscriptionplans(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Support filtering by userType, planType, status
      const query: any = {};
      if (req.query.userType) query.userType = req.query.userType;
      if (req.query.planType) query.planType = req.query.planType;
      if (req.query.status) query.status = req.query.status;
      if (req.query.billingCycle) query.billingCycle = req.query.billingCycle;
      if (req.query.isPopular) query.isPopular = req.query.isPopular === "true";
      if (req.query.isRecommended) query.isRecommended = req.query.isRecommended === "true";

      // Extract pagination parameters
      query.page = req.query.page || 1;
      query.limit = req.query.limit || 10;

      const result = await subscriptionPlanService.getAll(query);

      // Sort plans by planType in ascending order: FREE → BASIC → PREMIUM → GROWTH → ENTERPRISE → PROFESSIONAL
      const planTypeOrder = {
        [PlanType.FREE]: 1,
        [PlanType.BASIC]: 2,
        [PlanType.PREMIUM]: 3,
        [PlanType.GROWTH]: 4,
        [PlanType.ENTERPRISE]: 5,
        [PlanType.PROFESSIONAL]: 6,
      };

      // Helper function to process plans and add benefits
      const processPlans = (plans: any[]) => {
        return plans.map((plan: any) => {
          const { whatYouGet, whatYouMiss } = generatePlanBenefits(plan, plan.userType);
          return {
            ...plan.toObject ? plan.toObject() : plan,
            whatYouGet,
            whatYouMiss,
          };
        });
      };

      // Handle both array and object responses
      if (Array.isArray(result)) {
        const processedPlans = processPlans(result);
        processedPlans.sort((a: any, b: any) => {
          const orderA = planTypeOrder[a.planType as PlanType] || 999;
          const orderB = planTypeOrder[b.planType as PlanType] || 999;
          return orderA - orderB;
        });
        return res
          .status(200)
          .json(new ApiResponse(200, processedPlans, "Subscription plans fetched successfully"));
      } else if (result && typeof result === 'object' && 'result' in result && Array.isArray(result.result)) {
        const processedPlans = processPlans(result.result);
        processedPlans.sort((a: any, b: any) => {
          const orderA = planTypeOrder[a.planType as PlanType] || 999;
          const orderB = planTypeOrder[b.planType as PlanType] || 999;
          return orderA - orderB;
        });
        return res
          .status(200)
          .json(new ApiResponse(200, { ...result, result: processedPlans }, "Subscription plans fetched successfully"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscription plans fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getSubscriptionplanById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await subscriptionPlanService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Subscription plan not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscription plan fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateSubscriptionplanById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Parse JSON fields if they come as FormData strings
      let body = req.body;
      const jsonFields = [
        'agencyJobPostLimits',
        'employerJobPostLimits',
        'inviteSendLimit',
        'viewProfileLimit',
        'contactUnlockLimit',
        'saveProfileLimit',
        'features'
      ];

      // Parse stringified JSON fields
      jsonFields.forEach(field => {
        if (body[field] && typeof body[field] === 'string') {
          try {
            body[field] = JSON.parse(body[field]);
          } catch (e) {
            // If it fails to parse, keep original value
          }
        }
      });

      // Handle file upload if present
      if (req.file) {
        try {
          const imageUrl = await uploadToS3(
            req.file.buffer,
            req.file.originalname,
            "subscription-plans"
          );
          body.planImage = imageUrl;
        } catch (uploadError) {
          console.error("Error uploading image to S3:", uploadError);
          return res
            .status(400)
            .json(new ApiError(400, "Failed to upload plan image"));
        }
      }

      // Validate only provided fields
      const validationErrors = validateSubscriptionPlanData(body);
      if (validationErrors.length > 0) {
        return res
          .status(400)
          .json(new ApiError(400, validationErrors.join(", ")));
      }

      const result = await subscriptionPlanService.updateById(
        req.params.id,
        body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update subscription plan"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscription plan updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteSubscriptionplanById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await subscriptionPlanService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete subscription plan"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscription plan deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Get plans by user type
  static async getPlansByUserType(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userType } = req.params;
      // if (!Object.values(UserType).includes(userType as UserType)) {
      //   return res
      //     .status(400)
      //     .json(new ApiError(400, "Invalid user type"));
      // }

      const pipeline = [
        {
          $lookup: {
            from: "features", // Collection name for features
            localField: "features",
            foreignField: "_id",
            as: "features",
          },
        },
        { $sort: { priority: 1 } }, // Higher priority first (or adjust based on logic)
      ];

      const result = await subscriptionPlanService.getAll(
        {
          userType,
          status: "active",
        },
        pipeline
      );

      // Sort plans by planType in ascending order: FREE → BASIC → PREMIUM → GROWTH → ENTERPRISE → PROFESSIONAL
      const planTypeOrder = {
        [PlanType.FREE]: 1,
        [PlanType.BASIC]: 2,
        [PlanType.PREMIUM]: 3,
        [PlanType.GROWTH]: 4,
        [PlanType.ENTERPRISE]: 5,
        [PlanType.PROFESSIONAL]: 6,
      };

      // Handle both array and object responses
      if (Array.isArray(result)) {
        result.sort((a: any, b: any) => {
          const orderA = planTypeOrder[a.planType as PlanType] || 999;
          const orderB = planTypeOrder[b.planType as PlanType] || 999;
          return orderA - orderB;
        });
      } else if (result && typeof result === 'object' && 'result' in result && Array.isArray(result.result)) {
        result.result.sort((a: any, b: any) => {
          const orderA = planTypeOrder[a.planType as PlanType] || 999;
          const orderB = planTypeOrder[b.planType as PlanType] || 999;
          return orderA - orderB;
        });
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Plans fetched by user type"));
    } catch (err) {
      next(err);
    }
  }

  // Get plans grouped by plan family (consolidate billing cycles per plan)
  static async getPlansGroupedByUserType(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userType } = req.params;
      const pipeline = [
        {
          $lookup: {
            from: "features",
            localField: "features",
            foreignField: "_id",
            as: "features",
          },
        },
        { $sort: { priority: 1 } },
      ];

      const rawResult: any = await subscriptionPlanService.getAll(
        {
          userType,
          status: "active",
        },
        pipeline
      );

      let plans: any[] = [];
      if (Array.isArray(rawResult)) plans = rawResult;
      else if (rawResult && typeof rawResult === "object" && Array.isArray(rawResult.result)) plans = rawResult.result;

      // Normalize billing cycle keys (accept both 'annual' and 'annually' etc.)
      const billingOrder: any = { lifetime: 0, monthly: 1, quarterly: 2, annually: 3, annual: 3, semi_annually: 4, pay_as_you_go: 5 };

      // Determine which plan families exist for this userType, then order by our preferred family order
      const presentTypes = Array.from(new Set(plans.map((p: any) => p.planType)));
      const preferredOrder = [PlanType.FREE, PlanType.BASIC, PlanType.PREMIUM, PlanType.GROWTH, PlanType.ENTERPRISE, PlanType.PROFESSIONAL];
      const orderedTypes = preferredOrder.filter((t) => presentTypes.includes(t));

      const groups: Record<string, any> = {};

      plans
        .filter((p: any) => orderedTypes.includes(p.planType))
        .forEach((plan: any) => {
          const key = plan.planType; // group by planType only
          if (!groups[key]) {
            // Friendly family display names
            const familyDisplay: Record<string, string> = {
              [PlanType.FREE]: "Free",
              [PlanType.BASIC]: "Basic",
              [PlanType.PREMIUM]: "Premium",
              [PlanType.GROWTH]: "Growth",
              [PlanType.ENTERPRISE]: "Enterprise",
              [PlanType.PROFESSIONAL]: "Professional",
            };

            groups[key] = {
              planType: plan.planType,
              displayName: familyDisplay[plan.planType] || (plan.planType.charAt(0).toUpperCase() + plan.planType.slice(1)),
              tagline: null,
              description: null,
              planImage: null,
              isRecommended: false,
              isPopular: false,
              priority: Number.MAX_SAFE_INTEGER,
              // New aggregated limit/feature fields
              inviteSendLimit: null,
              viewProfileLimit: null,
              contactUnlockLimit: null,
              saveProfileLimit: null,
              agencyJobPostLimits: null,
              employerJobPostLimits: null,
              jobViewPerMonth: null,
              whatYouGet: [],
              whatYouMiss: [],
              billingOptions: [],
            };
          }

          // Normalize billing cycle value
          const rawCycle = String(plan.billingCycle || "").toLowerCase();
          const billingCycle = rawCycle === "annual" ? "annually" : rawCycle;

          // collect billing option (use normalized billingCycle)
          groups[key].billingOptions.push({
            id: plan._id,
            name: plan.name,
            displayName: plan.displayName,
            billingCycle: billingCycle,
            basePrice: plan.basePrice,
            currency: plan.currency,
            status: plan.status,
            priority: plan.priority || 0,
            planImage: plan.planImage || null,
          });

          // Helper to normalize number/string/object limits
          const normalizeLimit = (val: any) => {
            if (val === null || val === undefined) return null;
            if (typeof val === "number") return val;
            if (typeof val === "string") {
              const n = Number(val);
              return isNaN(n) ? val : n;
            }
            if (typeof val === "object") {
              const res: any = {};
              Object.keys(val).forEach((k) => {
                const v = val[k];
                if (v === null || v === undefined) res[k] = null;
                else if (typeof v === "number") res[k] = v;
                else if (typeof v === "string") {
                  const n = Number(v);
                  res[k] = isNaN(n) ? v : n;
                } else res[k] = v;
              });
              return res;
            }
            return val;
          };

          // prefer monthly or lifetime plans to set group-level limits and fall back to first available
          const prefer = [BillingCycle.MONTHLY, BillingCycle.LIFETIME].includes(billingCycle as BillingCycle);

          const nInvite = normalizeLimit(plan.inviteSendLimit);
          if (prefer || groups[key].inviteSendLimit === null) groups[key].inviteSendLimit = nInvite;

          const nView = normalizeLimit(plan.viewProfileLimit);
          if (prefer || groups[key].viewProfileLimit === null) groups[key].viewProfileLimit = nView;

          const nContact = normalizeLimit(plan.contactUnlockLimit);
          if (prefer || groups[key].contactUnlockLimit === null) groups[key].contactUnlockLimit = nContact;

          const nSaveProfile = normalizeLimit(plan.saveProfileLimit);
          if (prefer || groups[key].saveProfileLimit === null) groups[key].saveProfileLimit = nSaveProfile;

          // job post limits are objects
          if (prefer || groups[key].agencyJobPostLimits === null) groups[key].agencyJobPostLimits = plan.agencyJobPostLimits || null;
          if (prefer || groups[key].employerJobPostLimits === null) groups[key].employerJobPostLimits = plan.employerJobPostLimits || null;

          const nJobView = normalizeLimit(plan.jobViewPerMonth);
          if (prefer || groups[key].jobViewPerMonth === null) groups[key].jobViewPerMonth = nJobView;

          // Prefer monthly or lifetime for family-level tagline/description.
          if (billingCycle === BillingCycle.MONTHLY || billingCycle === BillingCycle.LIFETIME) {
            groups[key].tagline = groups[key].tagline || plan.tagline || null;
            groups[key].description = groups[key].description || plan.description || null;
            groups[key].planImage = groups[key].planImage || plan.planImage || null;
          }

          // fallback to any available tagline/description/image
          groups[key].tagline = groups[key].tagline || plan.tagline || null;
          groups[key].description = groups[key].description || plan.description || null;
          groups[key].planImage = groups[key].planImage || plan.planImage || null;

          // aggregate flags and find minimal priority
          groups[key].isRecommended = groups[key].isRecommended || !!plan.isRecommended;
          groups[key].isPopular = groups[key].isPopular || !!plan.isPopular;
          groups[key].priority = Math.min(groups[key].priority, plan.priority || 0);

          // Generate benefits based on plan limits and features
          const { whatYouGet, whatYouMiss } = generatePlanBenefits(plan, userType);
          
          // Aggregate whatYouGet and whatYouMiss (combine arrays, remove duplicates)
          groups[key].whatYouGet = [...new Set([...groups[key].whatYouGet, ...whatYouGet])];
          if (whatYouMiss && Array.isArray(whatYouMiss)) {
            groups[key].whatYouMiss = [...new Set([...groups[key].whatYouMiss, ...whatYouMiss])];
          }
        });

      // Build final grouped array in preferred order (only includes present types)
      const groupedArr = preferredOrder
        .filter((t) => !!groups[t])
        .map((t, index, arr) => {
          const g = groups[t];
          // sort billing options by billing cycle order
          g.billingOptions.sort((a: any, b: any) => (billingOrder[a.billingCycle] || 999) - (billingOrder[b.billingCycle] || 999));
          // remove priority from top-level if it was Number.MAX_SAFE_INTEGER (no plans)
          if (g.priority === Number.MAX_SAFE_INTEGER) g.priority = 0;
          
          // Calculate whatYouMiss by comparing with higher tier plans
          const allBenefitsAbove = new Set<string>();
          
          // Collect all benefits from higher tier plans
          for (let i = index + 1; i < arr.length; i++) {
            const higherPlanType = arr[i];
            const higherPlanGroup = groups[higherPlanType];
            if (higherPlanGroup && higherPlanGroup.whatYouGet) {
              higherPlanGroup.whatYouGet.forEach((benefit: string) => {
                allBenefitsAbove.add(benefit);
              });
            }
          }
          
          // whatYouMiss = benefits in higher plans that this plan doesn't have
          const currentBenefits = new Set(g.whatYouGet);
          g.whatYouMiss = Array.from(allBenefitsAbove).filter(benefit => !currentBenefits.has(benefit));
          
          return g;
        });



      return res
        .status(200)
        .json(new ApiResponse(200, { result: groupedArr }, "Plans grouped by user type"));
    } catch (err) {
      next(err);
    }
  }

  // Get recommended plans
  static async getRecommendedPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await subscriptionPlanService.getAll({
        isRecommended: true,
        status: "active",
      });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Recommended plans fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async compairPlansByUserType(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userType } = req.params;

      // Fetch plans (no need to $lookup features for this comparison)
      const rawResult: any = await subscriptionPlanService.getAll(
        {
          userType,
          status: "active",
        }
      );

      // Normalize to array of plans
      let plans: any[] = [];
      if (Array.isArray(rawResult)) plans = rawResult;
      else if (rawResult && typeof rawResult === "object" && Array.isArray(rawResult.result)) plans = rawResult.result;

      // Define ordering for plan types and billing cycles
      const planTypeOrder: any = {
        [PlanType.FREE]: 1,
        [PlanType.BASIC]: 2,
        [PlanType.PREMIUM]: 3,
        [PlanType.GROWTH]: 4,
        [PlanType.ENTERPRISE]: 5,
        [PlanType.PROFESSIONAL]: 6,
      };
      const billingOrder: any = { monthly: 1, quarterly: 2, annually: 3 };

      plans.sort((a: any, b: any) => {
        const pa = planTypeOrder[a.planType] || 999;
        const pb = planTypeOrder[b.planType] || 999;
        if (pa !== pb) return pa - pb;
        const ba = billingOrder[a.billingCycle] || 999;
        const bb = billingOrder[b.billingCycle] || 999;
        if (ba !== bb) return ba - bb;
        return (a.priority || 0) - (b.priority || 0);
      });

      // Attributes to compare (per your request)
      const attributesToCompare = [
        "monthlyJobListingLimit",
        "agencyJobPostLimits",
        "employerJobPostLimits",
        "totalSavesLimit",
        "saveProfilesLimit",
        "saveJobsLimit",
        "saveDraftsLimit",
        "inviteSendLimit",
        "viewProfileLimit",
        "contactUnlockLimit",
        "saveProfileLimit",
        "jobViewPerMonth",
      ];

      // Helper to normalize mixed/legacy fields (number | string | object)
      const normalizeLimit = (val: any) => {
        if (val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const n = Number(val);
          return isNaN(n) ? val : n;
        }
        if (typeof val === "object") {
          // Normalize sub-fields and coerce numeric strings to numbers
          const res: any = {};
          Object.keys(val).forEach((k) => {
            const v = val[k];
            if (v === null || v === undefined) res[k] = null;
            else if (typeof v === "number") res[k] = v;
            else if (typeof v === "string") {
              const n = Number(v);
              res[k] = isNaN(n) ? v : n;
            } else res[k] = v;
          });
          return res;
        }
        return val;
      };

      const comparison = attributesToCompare.map((attr) => {
        const values = plans.map((plan) => {
          let value: any = null;

          if ([
            "inviteSendLimit",
            "viewProfileLimit",
            "contactUnlockLimit",
            "saveProfileLimit",
          ].includes(attr)) {
            value = normalizeLimit((plan as any)[attr]);
          } else if (["agencyJobPostLimits", "employerJobPostLimits"].includes(attr)) {
            const obj = (plan as any)[attr];
            value = obj ? {
              customer: obj.customer ?? null,
              agency: obj.agency ?? null,
              candidate: obj.candidate ?? null,
            } : null;
          } else {
            // Numeric or simple fields
            const raw = (plan as any)[attr];
            if (raw === undefined) value = null;
            else if (typeof raw === "string") {
              const n = Number(raw);
              value = isNaN(n) ? raw : n;
            } else value = raw;
          }

          return {
            id: plan._id,
            name: plan.displayName || plan.name,
            planType: plan.planType,
            billingCycle: plan.billingCycle,
            value,
          };
        });

        const first = JSON.stringify(values[0]?.value ?? null);
        const allEqual = values.every((v) => JSON.stringify(v.value ?? null) === first);
        return {
          attribute: attr,
          different: !allEqual,
          values,
        };
      });

      // Return only the comparison array
      return res
        .status(200)
        .json(new ApiResponse(200, comparison, "Plans compared by user type"));
    } catch (err) {
      next(err);
    }
  }

  // Get popular plans
  static async getPopularPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await subscriptionPlanService.getAll({
        isPopular: true,
        status: "active",
      });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Popular plans fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Update plan features specifically
  static async updatePlanFeatures(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { contractorFeatures } = req.body;

      if (!contractorFeatures) {
        return res
          .status(400)
          .json(new ApiError(400, "Contractor features are required"));
      }

      const result = await subscriptionPlanService.updateById(id, {
        contractorFeatures,
      });

      if (!result) {
        return res
          .status(404)
          .json(new ApiError(404, "Plan not found or failed to update"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Plan features updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Toggle plan status
  static async togglePlanStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const plan = await subscriptionPlanService.getById(id);

      if (!plan) {
        return res
          .status(404)
          .json(new ApiError(404, "Plan not found"));
      }

      const newStatus = plan.status === "active" ? "inactive" : "active";
      const result = await subscriptionPlanService.updateById(id, {
        status: newStatus,
      });

      return res
        .status(200)
        .json(new ApiResponse(200, result, `Plan status changed to ${newStatus}`));
    } catch (err) {
      next(err);
    }
  }

}
