import { Request, Response } from "express";
import ServiceLocation from "../../modals/servicelocation.model";

// Create a new service location
export const createServiceLocation = async (req: Request, res: Response) => {
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

    const newServiceLocation = await ServiceLocation.create({
      serviceId,
      location: location.trim(),
      createdBy: (req as any).user?._id,
    });

    return res.status(201).json({
      success: true,
      message: "Service location created successfully",
      data: newServiceLocation,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error creating service location",
    });
  }
};

// Get all locations for a specific service
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

// Get all service locations with pagination and filters
export const getAllServiceLocations = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const serviceId = req.query.serviceId as string;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    // Build match stage
    const matchStage: any = {};
    if (serviceId) {
      matchStage.serviceId = serviceId;
    }
    if (status) {
      matchStage.status = status;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "supportservices",
                localField: "serviceId",
                foreignField: "_id",
                as: "serviceDetails",
              },
            },
            {
              $unwind: {
                path: "$serviceDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "createdBy",
                foreignField: "_id",
                as: "createdByUser",
              },
            },
            {
              $unwind: {
                path: "$createdByUser",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 1,
                location: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                serviceId: {
                  _id: "$serviceDetails._id",
                  title: "$serviceDetails.title",
                  serviceFor: "$serviceDetails.serviceFor",
                },
                createdBy: {
                  _id: "$createdByUser._id",
                  name: "$createdByUser.name",
                  email: "$createdByUser.email",
                },
              },
            },
          ],
        },
      },
    ];

    const result = await ServiceLocation.aggregate(pipeline as any);
    const total = result[0]?.metadata?.[0]?.total || 0;
    const locations = result[0]?.data || [];

    return res.status(200).json({
      success: true,
      message: "Service locations fetched successfully",
      data: locations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching service locations",
    });
  }
};

// Get service location by ID
export const getServiceLocationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const location = await ServiceLocation.findById(id)
      .populate("serviceId")
      .populate("createdBy", "name email");

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Service location not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service location fetched successfully",
      data: location,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching service location",
    });
  }
};

// Update service location
export const updateServiceLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { location, status } = req.body;

    if (!location && !status) {
      return res.status(400).json({
        success: false,
        message: "At least one field (location or status) is required",
      });
    }

    const updateData: any = {};
    if (location) {
      updateData.location = location.trim();
    }
    if (status) {
      updateData.status = status;
    }
    updateData.updatedBy = (req as any).user?._id;

    const updatedLocation = await ServiceLocation.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("serviceId", "title serviceFor")
      .populate("createdBy updatedBy", "name email");

    if (!updatedLocation) {
      return res.status(404).json({
        success: false,
        message: "Service location not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service location updated successfully",
      data: updatedLocation,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error updating service location",
    });
  }
};

// Delete service location
export const deleteServiceLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedLocation = await ServiceLocation.findByIdAndDelete(id);

    if (!deletedLocation) {
      return res.status(404).json({
        success: false,
        message: "Service location not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service location deleted successfully",
      data: deletedLocation,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error deleting service location",
    });
  }
};
