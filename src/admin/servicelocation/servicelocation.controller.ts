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
let ensuredServiceLocationIndexes = false;

const ensureServiceLocationIndexes = async () => {
  if (ensuredServiceLocationIndexes) return;

  try {
    const indexes = await ServiceLocation.collection.indexes();
    const legacyIndexNames = new Set([
      "serviceId_1_location_1",
      "serviceId_1_state_1_city_1",
    ]);

    for (const index of indexes) {
      const indexName = index?.name;
      if (!indexName) continue;

      if (legacyIndexNames.has(indexName)) {
        await ServiceLocation.collection.dropIndex(indexName);
      }
    }

    ensuredServiceLocationIndexes = true;
  } catch (error: any) {
    // Namespace may not exist on fresh DB; ignore and continue.
    if (error?.codeName !== "NamespaceNotFound") {
      throw error;
    }
    ensuredServiceLocationIndexes = true;
  }
};

export class ServiceLocationController {
  static async createServiceLocation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { serviceId, state, city, address, locationType } = req.body;
      await ensureServiceLocationIndexes();

      // Validation
      if (!serviceId || !state || !city || !address || !locationType) {
        return res.status(400).json({
          success: false,
          message: "serviceId, state, city, address, and locationType are required",
        });
      }

      const normalizedState = String(state).trim();
      const normalizedCity = String(city).trim();
      const normalizedAddress = String(address).trim();
      const normalizedLocationType = String(locationType).trim();

      // Only block exact duplicate row (same service + state + city + address + locationType)
      const existingLocation = await ServiceLocation.findOne({
        serviceId,
        state: normalizedState,
        city: normalizedCity,
        address: normalizedAddress,
        locationType: normalizedLocationType,
      });

      if (existingLocation) {
        return res.status(409).json({
          success: false,
          message:
            "This exact service location already exists. Change city/address/locationType or update the existing record.",
        });
      }

      const data = {
        ...req.body,
        state: normalizedState,
        city: normalizedCity,
        address: normalizedAddress,
        locationType: normalizedLocationType,
        createdBy: (req as any).user?.id,
      };
      const result = await ServiceLocationService.create(data);

      return res.status(201).json(
        new ApiResponse(201, result, "Service location created successfully")
      );
    } catch (error: any) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "Duplicate service location detected by database index. Please verify unique fields and retry.",
        });
      }
      next(error);
    }
  }

  static async getAllServiceLocations(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const isAuthenticatedRequest = Boolean((req as any).user?.id);
      const effectiveStatus =
        (req.query.status as string) ||
        (!isAuthenticatedRequest ? "active" : undefined);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const serviceType = req.query.serviceType as string;

      let matchStage = buildMatchStage(
        {
          status: effectiveStatus,
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

      // If serviceType is provided, use aggregation to filter by service type
      if (serviceType) {
        const validServiceTypes = ["ESIC", "EPFO", "LOAN", "LWF"];
        if (!validServiceTypes.includes(serviceType)) {
          return res.status(400).json({
            success: false,
            message: `Service type must be one of: ${validServiceTypes.join(", ")}`,
          });
        }

        const pipeline: any[] = [
          {
            $lookup: {
              from: "supportservices",
              localField: "serviceId",
              foreignField: "_id",
              as: "serviceDetails",
            },
          },
          {
            $match: {
              "serviceDetails.serviceFor": serviceType,
              ...matchStage,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "createdByDetails",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "updatedBy",
              foreignField: "_id",
              as: "updatedByDetails",
            },
          },
          { $sort: sortObj },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              serviceId: { $arrayElemAt: ["$serviceDetails", 0] },
              state: 1,
              city: 1,
              address: 1,
              notes: 1,
              locationType: 1,
              scheme: 1,
              status: 1,
              createdBy: { $arrayElemAt: ["$createdByDetails", 0] },
              updatedBy: { $arrayElemAt: ["$updatedByDetails", 0] },
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ];

        const total = await ServiceLocation.countDocuments();
        const countPipeline = [
          {
            $lookup: {
              from: "supportservices",
              localField: "serviceId",
              foreignField: "_id",
              as: "serviceDetails",
            },
          },
          {
            $match: {
              "serviceDetails.serviceFor": serviceType,
              ...matchStage,
            },
          },
          { $count: "total" },
        ];

        const countResult = await ServiceLocation.aggregate(countPipeline);
        const filteredTotal = countResult[0]?.total || 0;

        const locations = await ServiceLocation.aggregate(pipeline);

        return res.status(200).json(
          new ApiResponse(
            200,
            buildPaginationResponse(locations, filteredTotal, page, limit),
            "Service locations fetched successfully"
          )
        );
      }

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
      const data = { ...req.body, updatedBy: (req as any).user?.id };
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
