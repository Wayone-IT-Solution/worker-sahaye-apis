import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Course } from "../../modals/courses.model";
import { deleteFromS3 } from "../../config/s3Uploader";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { getReviewStats } from "../../public/coursereview/coursereview.controller";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { PlanType } from "../../modals/subscriptionplan.model";
import { User } from "../../modals/user.model";

const courseService = new CommonService(Course);

// Helper function to get course access and pricing benefits based on subscription plan
const getCourseAccessBenefits = async (userId: string | null) => {
  // Default benefits for FREE plan (no subscription)
  const defaultBenefits = {
    planType: PlanType.FREE,
    canViewTrainingPrograms: true,
    trainingFeeDiscount: 0,
    canGetSkillCertification: false,
    canGetSkillBadge: false,
  };

  if (!userId) {
    return defaultBenefits;
  }

  // Get user's active subscription plan
  const enrolledPlan = await EnrolledPlan.findOne({
    user: userId,
    status: "active",
  }).populate("plan");

  // If no active plan, return FREE plan benefits
  if (!enrolledPlan || !enrolledPlan.plan) {
    return defaultBenefits;
  }

  const planType = (enrolledPlan.plan as any).planType;

  // Define course benefits based on plan type
  const benefitsMap: Record<
    string,
    {
      planType: string;
      canViewTrainingPrograms: boolean;
      trainingFeeDiscount: number;
      canGetSkillCertification: boolean;
      canGetSkillBadge: boolean;
    }
  > = {
    [PlanType.FREE]: {
      planType: PlanType.FREE,
      canViewTrainingPrograms: true,
      trainingFeeDiscount: 0,
      canGetSkillCertification: false,
      canGetSkillBadge: false,
    },
    [PlanType.BASIC]: {
      planType: PlanType.BASIC,
      canViewTrainingPrograms: true,
      trainingFeeDiscount: 10,
      canGetSkillCertification: true,
      canGetSkillBadge: false,
    },
    [PlanType.PREMIUM]: {
      planType: PlanType.PREMIUM,
      canViewTrainingPrograms: true,
      trainingFeeDiscount: 30,
      canGetSkillCertification: true,
      canGetSkillBadge: true,
    },
  };

  return benefitsMap[planType] ?? defaultBenefits;
};

export class CourseController {
  static async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      let { isFree, tags } = req.body;

      // Normalize isFree coming from form ('active'/'inactive' or boolean)
      if (isFree === "active" || isFree === "inactive") {
        isFree = isFree === "active";
      }
      // Normalize tags string -> array
      if (typeof tags === "string") tags = tags.split(",").map((t: string) => t.trim()).filter(Boolean);

      const data = {
        ...req.body,
        isFree,
        tags,
        imageUrl: req?.body?.imageUrl?.[0]?.url,
      };

      const result = await courseService.create(data);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create course"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || null;
      const benefits = await getCourseAccessBenefits(userId);
      const categoryWise = String(req.query.categoryWise) === "true";
      console.log(req.query.categoryWise);
      console.log("categoryWise:", categoryWise);

      // Fetch user's worker category if authenticated
      let userWorkerCategoryId = null;
      if (userId && categoryWise) {
        const user = await User.findById(userId).select("workerCategory");
        userWorkerCategoryId = user?.workerCategory;
      }

      const pipeline: any[] = [
        {
          $lookup: {
            from: "coursereviews",
            localField: "_id",
            foreignField: "courseId",
            as: "reviews",
          },
        },
        {
          $addFields: {
            averageRating: {
              $cond: [
                { $gt: [{ $size: "$reviews" }, 0] },
                { $avg: "$reviews.rating" },
                0,
              ],
            },
            totalReviews: { $size: "$reviews" },
          },
        },
        { $project: { reviews: 0 } },
      ];

      // Add category filter only if categoryWise=true and user has a worker category
      if (userWorkerCategoryId) {
        pipeline.push({
          $match: {
            category: userWorkerCategoryId,
          },
        });
      }

      // Remove categoryWise from query to avoid interference with service logic
      const queryParams = { ...req.query };
      delete queryParams.categoryWise;

      let result: any = await courseService.getAll(queryParams, pipeline);

      // Add personalized pricing for each course
      if (Array.isArray(result)) {
        result = result.map((course: any) => {
          let yourPrice = course.amount;
          let discountAmount = 0;

          // Calculate discount for paid courses
          if (!course.isFree && benefits.trainingFeeDiscount > 0) {
            discountAmount = Math.round((course.amount * benefits.trainingFeeDiscount) / 100);
            yourPrice = course.amount - discountAmount;
          }

          return {
            ...course,
            originalPrice: course.amount,
            yourPrice,
            discountPercentage: benefits.trainingFeeDiscount,
            discountAmount,
            userPlanType: benefits.planType,
          };
        });
      } else if (result && result.result) {
        result.result = result.result.map((course: any) => {
          let yourPrice = course.amount;
          let discountAmount = 0;

          // Calculate discount for paid courses
          if (!course.isFree && benefits.trainingFeeDiscount > 0) {
            discountAmount = Math.round((course.amount * benefits.trainingFeeDiscount) / 100);
            yourPrice = course.amount - discountAmount;
          }

          return {
            ...course,
            originalPrice: course.amount,
            yourPrice,
            discountPercentage: benefits.trainingFeeDiscount,
            discountAmount,
            userPlanType: benefits.planType,
          };
        });
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getCourseById(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = (req as any).user;
      const userId = (req as any).user?.id || null;
      let result = await courseService.getById(req.params.id, role !== "admin");
      if (!result)
        return res.status(404).json(new ApiError(404, "course not found"));

      const reviewsData = await getReviewStats(req.params.id.toString());
      result = JSON.parse(JSON.stringify(result));

      // Get user's subscription benefits for personalized pricing
      const benefits = await getCourseAccessBenefits(userId);

      // Calculate personalized price
      let yourPrice = result.amount;
      let discountAmount = 0;

      if (!result.isFree && benefits.trainingFeeDiscount > 0) {
        discountAmount = Math.round((result.amount * benefits.trainingFeeDiscount) / 100);
        yourPrice = result.amount - discountAmount;
      }

      const data = {
        ...result,
        ...reviewsData,
        originalPrice: result.amount,
        yourPrice,
        discountPercentage: benefits.trainingFeeDiscount,
        discountAmount,
        userPlanType: benefits.planType,
      };

      return res
        .status(200)
        .json(new ApiResponse(200, data, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateCourseById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const extractImageUrl = async (input: any, existing: string) => {
        if (!input || (Array.isArray(input) && input.length === 0))
          return existing || "";
        if (Array.isArray(input) && input.length > 0) {
          const newUrl = input[0]?.url;
          if (existing && existing !== newUrl) {
            const s3Key = existing.split(".com/")[1];
            await deleteFromS3(s3Key);
          }
          return newUrl || "";
        }
        if (typeof input === "string") return input;
        return existing || "";
      };

      const existingCourse: any = await courseService.getById(req.params.id);
      if (!existingCourse)
        return res.status(404).json(new ApiError(404, "Course not found"));

      let { isFree, tags } = req.body;
      if (isFree === "active" || isFree === "inactive") {
        req.body.isFree = isFree === "active";
      }
      if (typeof tags === "string") req.body.tags = tags.split(",");

      const normalizedData = {
        ...req.body,
        imageUrl: await extractImageUrl(
          req.body.imageUrl,
          existingCourse?.imageUrl
        ),
      };
      const result = await courseService.updateById(
        req.params.id,
        normalizedData
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update course"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteCourseById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await courseService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete course"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getTrainingBenefits(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req as any).user?.id || null;
      const benefits = await getCourseAccessBenefits(userId);

      return res.status(200).json(
        new ApiResponse(
          200,
          benefits,
          "Training and Certification benefits fetched successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }
}
