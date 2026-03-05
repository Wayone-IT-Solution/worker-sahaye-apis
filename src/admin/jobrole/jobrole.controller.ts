import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { JobRole } from "../../modals/jobrole.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import {
  buildMatchStage,
  buildSortObject,
  buildPaginationResponse,
  SEARCH_FIELD_MAP,
} from "../../utils/queryBuilder";

const jobRoleService = new CommonService(JobRole);
const PUBLIC_JOB_ROLE_STATUSES = new Set(["active", "inactive"]);

/**
 * Generate URL-friendly slug from name
 * e.g., "Senior Software Engineer" -> "senior-software-engineer"
 */
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export class JobRoleController {
  static async createJobRole(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = (req as any).user?.id;
      const incomingPayload = req.body;

      if (Array.isArray(incomingPayload)) {
        if (!incomingPayload.length) {
          return res
            .status(400)
            .json(new ApiError(400, "Bulk payload cannot be empty"));
        }

        const seenSlugs = new Set<string>();
        const bulkPayload: Array<Record<string, any>> = [];

        for (let index = 0; index < incomingPayload.length; index += 1) {
          const item = incomingPayload[index];
          const rowNumber = index + 1;
          const name = String(item?.name || "").trim();

          if (!name) {
            return res
              .status(400)
              .json(new ApiError(400, `Row ${rowNumber}: "name" is required`));
          }

          const slug = generateSlug(name);
          if (!slug) {
            return res.status(400).json(
              new ApiError(400, `Row ${rowNumber}: Unable to generate slug from name`)
            );
          }

          if (seenSlugs.has(slug)) {
            return res.status(400).json(
              new ApiError(400, `Row ${rowNumber}: Duplicate job role name in upload`)
            );
          }

          seenSlugs.add(slug);
          bulkPayload.push({
            ...item,
            name,
            slug,
            createdBy: adminId,
          });
        }

        const existingRoles = await JobRole.find({
          slug: { $in: Array.from(seenSlugs) },
        })
          .select("name")
          .lean();

        if (existingRoles.length > 0) {
          const existingNames = existingRoles
            .map((role: any) => String(role?.name || "").trim())
            .filter(Boolean);
          return res.status(400).json(
            new ApiError(
              400,
              `Job role(s) already exist: ${existingNames.join(", ")}`
            )
          );
        }

        const result = await JobRole.insertMany(bulkPayload);
        return res.status(201).json(
          new ApiResponse(
            201,
            result,
            `${result.length} job role(s) created successfully`
          )
        );
      }

      // Generate slug from name
      const slug = generateSlug(req.body.name);

      // Check if slug already exists
      const existingRole = await JobRole.findOne({ slug });
      if (existingRole) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `A job role with the name "${req.body.name}" already exists`
            )
          );
      }

      const data = {
        ...req.body,
        slug,
        createdBy: adminId,
      };

      const result = await jobRoleService.create(data);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create job role"));

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Job role created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllJobRoles(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const isAuthenticatedRequest = Boolean((req as any).user?.id);
      const rawStatusQuery = String(req.query.status || "").trim().toLowerCase();
      const hasStatusQuery = rawStatusQuery.length > 0;

      if (
        !isAuthenticatedRequest &&
        hasStatusQuery &&
        !PUBLIC_JOB_ROLE_STATUSES.has(rawStatusQuery)
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Public status supports only active or inactive"));
      }

      const effectiveStatus = hasStatusQuery
        ? rawStatusQuery
        : !isAuthenticatedRequest
          ? "active"
          : undefined;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const matchStage = buildMatchStage(
        {
          status: effectiveStatus,
          search: req.query.search as string,
          searchKey: req.query.searchKey as string,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          categoryId: req.query.categoryId as string,
        },
        SEARCH_FIELD_MAP.jobrole
      );

      const sortObj = buildSortObject(
        req.query.sortKey as string,
        req.query.sortDir as string,
        { order: 1, name: 1 }
      );

      const pipeline = [
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $lookup: {
            from: "jobcategories",
            localField: "category",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        {
          $unwind: {
            path: "$categoryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        { $sort: sortObj },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  slug: 1,
                  order: 1,
                  description: 1,
                  status: 1,
                  salaryRange: 1,
                  requiredExperience: 1,
                  tags: 1,
                  icon: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  category: {
                    _id: "$categoryDetails._id",
                    name: "$categoryDetails.name",
                    type: "$categoryDetails.type",
                    description: "$categoryDetails.description",
                    icon: "$categoryDetails.icon",
                  },
                },
              },
            ],
          },
        },
      ];

      const result = await JobRole.aggregate(pipeline);
      const total = result[0]?.metadata?.[0]?.total || 0;
      const jobRoles = result[0]?.data || [];

      return res.status(200).json(
        new ApiResponse(
          200,
          buildPaginationResponse(jobRoles, total, page, limit),
          "Job roles fetched successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getJobRoleById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await JobRole.findById(req.params.id).populate({
        path: "category",
        select: "_id name type description icon",
      });

      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Job role not found"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Job role fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getJobRoleBySlug(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await JobRole.findOne({ slug: req.params.slug }).populate([
        { path: "category" },
        { path: "createdBy", select: "email fullName" },
        { path: "updatedBy", select: "email fullName" },
      ]);

      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Job role not found"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Job role fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateJobRoleById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = (req as any).user?.id;

      let data = {
        ...req.body,
        updatedBy: adminId,
      };

      // If name is being updated, regenerate slug
      if (req.body.name) {
        const newSlug = generateSlug(req.body.name);

        // Check if new slug already exists (excluding current record)
        const existingRole = await JobRole.findOne({
          slug: newSlug,
          _id: { $ne: req.params.id },
        });

        if (existingRole) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `A job role with the name "${req.body.name}" already exists`
              )
            );
        }

        data.slug = newSlug;
      }

      const result = await jobRoleService.updateById(req.params.id, data);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Job role not found or update failed"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Job role updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteJobRoleById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await jobRoleService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Job role not found or delete failed"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Job role deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async searchJobRoles(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string") {
        return res
          .status(400)
          .json(new ApiError(400, "Search query is required"));
      }

      const isAuthenticatedRequest = Boolean((req as any).user?.id);
      const searchFilter: any = { $text: { $search: query } };

      if (!isAuthenticatedRequest) {
        searchFilter.status = "active";
      }

      const results = await JobRole.find(
        searchFilter,
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .populate("category");

      return res
        .status(200)
        .json(new ApiResponse(200, results, "Job roles found"));
    } catch (err) {
      next(err);
    }
  }

  static async getActiveJobRoles(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query = {
        ...req.query,
        status: "active",
        sortKey: (req.query.sortKey as string) || "order",
        sortDir: (req.query.sortDir as string) || "1",
      };

      const result = await jobRoleService.getAll(query);
      return res
        .status(200)
        .json(
          new ApiResponse(200, result, "Active job roles fetched successfully")
        );
    } catch (err) {
      next(err);
    }
  }
}
