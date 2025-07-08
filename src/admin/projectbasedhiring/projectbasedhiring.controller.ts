import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { ProjectBasedHiring } from "../../modals/projectbasedhiring.model";

const projectBasedHiringService = new CommonService(ProjectBasedHiring);

export class ProjectHiringController {
  static async createProjectHiring(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;

      // ✅ Only "employer" or "contractor" allowed
      if (!["employer", "contractor"].includes(role?.toLowerCase())) {
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              "Only employers or contractors can create project-based hiring requests."
            )
          );
      }

      // ✅ Check for existing active project-based hiring request
      const existing = await ProjectBasedHiring.findOne({
        userId,
        isActive: true,
        status: { $in: ["Open", "Assigned", "In Progress"] }, // update to match your model status
      });

      if (existing) {
        return res.status(200).json(
          new ApiResponse(
            200,
            existing,
            "You already have an active project-based hiring request."
          )
        );
      }

      // ✅ Create the new record
      const result = await projectBasedHiringService.create({
        ...req.body,
        userId,
      });

      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create project-based hiring"));
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllProjectHirings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id: userId, role } = (req as any).user;
      const result = await projectBasedHiringService.getAll({ ...req.query, ...(role === "admin" ? {} : userId) });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getProjectHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await projectBasedHiringService.getById(req.params.id, true);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "bulk hiring not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateProjectHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;

      const record = await projectBasedHiringService.getById(id);
      if (!record)
        return res
          .status(404)
          .json(new ApiError(404, "Project-based hiring request not found"));

      const allowedStatuses = ["Open", "In Progress"];
      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot update request with status '${record.status}'. Allowed only in: ${allowedStatuses.join(", ")}`
          )
        );
      }

      const result = await projectBasedHiringService.updateById(id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update project-based hiring"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteProjectHiringById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;

      const record = await projectBasedHiringService.getById(id);
      if (!record)
        return res
          .status(404)
          .json(new ApiError(404, "Project-based hiring request not found"));

      const allowedStatuses = ["Open", "Cancelled"];
      if (!allowedStatuses.includes(record.status)) {
        return res.status(403).json(
          new ApiError(
            403,
            `Cannot delete request with status '${record.status}'. Allowed only in: ${allowedStatuses.join(", ")}`
          )
        );
      }

      const result = await projectBasedHiringService.deleteById(id);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
