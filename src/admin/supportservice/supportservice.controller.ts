import { Request, Response } from "express";
import SupportService from "../../modals/supportservice.model";
import { PipelineStage } from "mongoose";

// Create a new support service
export const createSupportService = async (req: Request, res: Response) => {
  try {
    const { title, subtitle, description, serviceFor, order } = req.body;

    // Validation
    if (!title || !subtitle || !description || !serviceFor) {
      return res.status(400).json({
        success: false,
        message: "All fields (title, subtitle, description, serviceFor) are required",
      });
    }

    if (!Array.isArray(description) || description.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Description must be an array with at least one point",
      });
    }

    const validServiceTypes = ["ESIC", "EPFO", "LOAN", "LABOUR"];
    if (!validServiceTypes.includes(serviceFor)) {
      return res.status(400).json({
        success: false,
        message: `Service type must be one of: ${validServiceTypes.join(", ")}`,
      });
    }

    const newService = await SupportService.create({
      title,
      subtitle,
      description,
      serviceFor,
      order: order || 0,
      createdBy: (req as any).user?._id,
    });

    return res.status(201).json({
      success: true,
      message: "Support service created successfully",
      data: newService,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error creating support service",
    });
  }
};

// Get all support services with pagination and filters
export const getAllSupportServices = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const serviceFor = req.query.serviceFor as string;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    // Build match stage
    const matchStage: any = {};
    if (serviceFor) {
      matchStage.serviceFor = serviceFor;
    }
    if (status) {
      matchStage.status = status;
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { order: 1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
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
                title: 1,
                subtitle: 1,
                description: 1,
                serviceFor: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
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

    const result = await SupportService.aggregate(pipeline);
    const total = result[0]?.metadata?.[0]?.total || 0;
    const services = result[0]?.data || [];

    return res.status(200).json({
      success: true,
      message: "Support services fetched successfully",
      data: services,
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
      message: error.message || "Error fetching support services",
    });
  }
};

// Get support services by serviceFor type
export const getServicesByType = async (req: Request, res: Response) => {
  try {
    const { serviceFor } = req.params;

    const validServiceTypes = ["ESIC", "EPFO", "LOAN", "LABOUR"];
    if (!validServiceTypes.includes(serviceFor)) {
      return res.status(400).json({
        success: false,
        message: `Service type must be one of: ${validServiceTypes.join(", ")}`,
      });
    }

    const pipeline: PipelineStage[] = [
      { $match: { serviceFor, status: "active" } },
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
          title: 1,
          subtitle: 1,
          description: 1,
          serviceFor: 1,
          status: 1,
          createdAt: 1,
          createdBy: {
            _id: "$createdByUser._id",
            name: "$createdByUser.name",
          },
        },
      },
      { $sort: { order: 1, createdAt: -1 } },
    ];

    const services = await SupportService.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      message: `Services for ${serviceFor} fetched successfully`,
      data: services,
      count: services.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching services by type",
    });
  }
};

// Get support service by ID
export const getSupportServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const service = await SupportService.findById(id).populate("createdBy", "name email");

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Support service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Support service fetched successfully",
      data: service,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching support service",
    });
  }
};

// Update support service
export const updateSupportService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, description, serviceFor, status, order } = req.body;

    // Validate serviceFor if provided
    if (serviceFor) {
      const validServiceTypes = ["ESIC", "EPFO", "LOAN", "LABOUR"];
      if (!validServiceTypes.includes(serviceFor)) {
        return res.status(400).json({
          success: false,
          message: `Service type must be one of: ${validServiceTypes.join(", ")}`,
        });
      }
    }

    // Validate description if provided
    if (description && (!Array.isArray(description) || description.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Description must be an array with at least one point",
      });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (subtitle) updateData.subtitle = subtitle;
    if (description) updateData.description = description;
    if (serviceFor) updateData.serviceFor = serviceFor;
    if (status) updateData.status = status;
    if (order !== undefined) updateData.order = order;
    updateData.updatedBy = (req as any).user?._id;

    const updatedService = await SupportService.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("createdBy updatedBy", "name email");

    if (!updatedService) {
      return res.status(404).json({
        success: false,
        message: "Support service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Support service updated successfully",
      data: updatedService,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error updating support service",
    });
  }
};

// Delete support service
export const deleteSupportService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedService = await SupportService.findByIdAndDelete(id);

    if (!deletedService) {
      return res.status(404).json({
        success: false,
        message: "Support service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Support service deleted successfully",
      data: deletedService,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error deleting support service",
    });
  }
};

// Search support services
export const searchSupportServices = async (req: Request, res: Response) => {
  try {
    const { query, serviceFor } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const matchStage: any = { $text: { $search: query as string } };
    if (serviceFor) {
      matchStage.serviceFor = serviceFor;
    }

    const services = await SupportService.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          score: { $meta: "textScore" },
        },
      },
      { $sort: { score: { $meta: "textScore" } } },
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
          title: 1,
          subtitle: 1,
          description: 1,
          serviceFor: 1,
          status: 1,
          createdAt: 1,
          score: 1,
          createdBy: {
            _id: "$createdByUser._id",
            name: "$createdByUser.name",
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Support services search results",
      data: services,
      count: services.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error searching support services",
    });
  }
};
