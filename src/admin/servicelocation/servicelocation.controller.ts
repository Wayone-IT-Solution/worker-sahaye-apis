import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import ServiceLocation from "../../modals/servicelocation.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import {
  buildMatchStage,
  buildSortObject,
  buildPaginationResponse,
  SEARCH_FIELD_MAP,
} from "../../utils/queryBuilder";

const ServiceLocationService = new CommonService(ServiceLocation as any);

export class ServiceLocationController {
  static async createServiceLocation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { serviceId, location } = req.body;

      // Validation
      if (!serviceId || !location) {
        return res.status(400).json({
          success: false,
          message: "serviceId and location are required",
        });
      }

      // Check if location already exists for this service
      const existingLocation = await ServiceLocation.findOne({
        serviceId,
        location: location.trim(),
      });

      if (existingLocation) {
        return res.status(400).json({
          success: false,
          message: "This location already exists for this service",
        });
      }

      const data = { ...req.body, createdBy: (req as any).user?._id };
      const result = await ServiceLocationService.create(data);

      return res.status(201).json(
        new ApiResponse(201, result, "Service location created successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAllServiceLocations(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const matchStage = buildMatchStage(
        {
          status: req.query.status as string,
          search: req.query.search as string,
          searchKey: req.query.searchKey as string,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          serviceId: req.query.serviceId as string,
        },
        SEARCH_FIELD_MAP.servicelocation
      );

      const sortObj = buildSortObject(
        req.query.sortKey as string,
        req.query.sortDir as string
      );

      const total = await ServiceLocation.countDocuments(matchStage);
      const locations = await ServiceLocation.find(matchStage)
        .populate("serviceId", "title subtitle description serviceFor")
        .populate("createdBy updatedBy", "name email")
        .sort(sortObj)
        .skip(skip)
        .limit(limit);

      return res.status(200).json(
        new ApiResponse(
          200,
          buildPaginationResponse(locations, total, page, limit),
          "Service locations fetched successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  }

  static async getServiceLocationById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await ServiceLocation.findById(req.params.id)
        .populate("serviceId", "title subtitle description serviceFor")
        .populate("createdBy updatedBy", "name email");
      if (!result) {
        return res.status(404).json(
          new ApiError(404, "Service location not found")
        );
      }
      return res.status(200).json(
        new ApiResponse(200, result, "Service location fetched successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateServiceLocation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = { ...req.body, updatedBy: (req as any).user?._id };
      const result = await ServiceLocationService.updateById(req.params.id, data);

      if (!result) {
        return res.status(404).json(
          new ApiError(404, "Service location not found")
        );
      }

      return res.status(200).json(
        new ApiResponse(200, result, "Service location updated successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteServiceLocation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await ServiceLocationService.deleteById(req.params.id);

      if (!result) {
        return res.status(404).json(
          new ApiError(404, "Service location not found")
        );
      }

      return res.status(200).json(
        new ApiResponse(200, result, "Service location deleted successfully")
      );
    } catch (error) {
      next(error);
    }
  }
}

// Export functions for backward compatibility
export const createServiceLocation = ServiceLocationController.createServiceLocation;
export const getAllServiceLocations = ServiceLocationController.getAllServiceLocations;
export const getServiceLocationById = ServiceLocationController.getServiceLocationById;
export const updateServiceLocation = ServiceLocationController.updateServiceLocation;
export const deleteServiceLocation = ServiceLocationController.deleteServiceLocation;
export const getLocationsByService = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: "serviceId is required",
      });
    }

    const locations = await ServiceLocation.find({
      serviceId,
      status: "active",
    })
      .populate("serviceId", "title subtitle description serviceFor")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    if (locations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No locations found for this service",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service locations fetched successfully",
      data: locations,
      count: locations.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching service locations",
    });
  }
};
