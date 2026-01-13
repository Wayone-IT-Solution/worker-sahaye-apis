import { Request, Response } from "express";
import SupportService from "../../modals/supportservice.model";
import { PipelineStage } from "mongoose";
import { EnrolledPlan } from "../../modals/enrollplan.model";
import { Booking } from "../../modals/booking.model";
import { SubscriptionPlan, PlanType } from "../../modals/subscriptionplan.model";
import {
  buildMatchStage,
  buildSortObject,
  buildPaginationResponse,
} from "../../utils/queryBuilder";

// Helper function to get canCall and hasActivePlan for a user and service
const getCallStatusForService = async (userId: string | null, serviceId: string) => {
  if (!userId) {
    return { canCall: false, hasActivePlan: false };
  }

  // Find booking for this user and service
  const booking = await Booking.findOne({
    user: userId,
    supportService: serviceId,
    status: { $ne: "cancelled" },
  });

  // Check if user has active basic or premium subscription
  const enrolledPlan = await EnrolledPlan.findOne({
    user: userId,
    status: "active",
  }).populate("plan");

  const activePlanTypes = [PlanType.BASIC, PlanType.PREMIUM];
  const hasActivePlan = enrolledPlan && activePlanTypes.includes((enrolledPlan.plan as any).planType);
  const canCall = booking?.canCall || false;

  return { canCall, hasActivePlan };
};

// Search field mapping for support service
const SUPPORT_SERVICE_SEARCH_FIELDS = {
  title: ["title"],
  subtitle: ["subtitle"],
  description: ["description"],
  serviceFor: ["serviceFor"],
  status: ["status"],
};

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
    const userId = (req as any).user?.id || null;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const matchStage: any = {};
    
    // Add direct filters
    if (req.query.serviceFor) {
      matchStage.serviceFor = req.query.serviceFor as string;
    }
    if (req.query.status) {
      matchStage.status = req.query.status as string;
    }

    // Search functionality
    const search = req.query.search as string;
    const searchKey = req.query.searchKey as string;
    if (search && searchKey && SUPPORT_SERVICE_SEARCH_FIELDS[searchKey as keyof typeof SUPPORT_SERVICE_SEARCH_FIELDS]) {
      const fields = SUPPORT_SERVICE_SEARCH_FIELDS[searchKey as keyof typeof SUPPORT_SERVICE_SEARCH_FIELDS];
      if (fields.length === 1) {
        matchStage[fields[0]] = { $regex: search, $options: "i" };
      }
    }

    // Date range filtering
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    // Build sort object
    const sortKey = req.query.sortKey as string;
    const sortDir = req.query.sortDir as string;
    const sortObj: any = {};
    if (sortKey && sortDir) {
      sortObj[sortKey] = parseInt(sortDir) === -1 ? -1 : 1;
    } else {
      sortObj.order = 1;
      sortObj.createdAt = -1;
    }

    const pipeline: PipelineStage[] = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sortObj as any },
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
                order: 1,
                createdAt: 1,
                updatedAt: 1,
                createdBy: {
                  _id: "$createdByUser._id",
                  name: "$createdByUser.name",
                  email: "$createdByUser.email",
                },
              },
            },
          ] as any,
        },
      },
    ];

    const result = await SupportService.aggregate(pipeline);
    const total = result[0]?.metadata?.[0]?.total || 0;
    const services = result[0]?.data || [];

    // Add canCall and hasActivePlan for each service
    const servicesWithCallStatus = await Promise.all(
      services.map(async (service: any) => {
        const callStatus = await getCallStatusForService(userId, service._id.toString());
        return {
          ...service,
          canCall: callStatus.canCall,
          hasActivePlan: callStatus.hasActivePlan,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Support services fetched successfully",
      data: buildPaginationResponse(servicesWithCallStatus, total, page, limit),
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
    const userId = (req as any).user?.id || null;

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

    // Add canCall and hasActivePlan for each service
    const servicesWithCallStatus = await Promise.all(
      services.map(async (service: any) => {
        const callStatus = await getCallStatusForService(userId, service._id.toString());
        return {
          ...service,
          canCall: callStatus.canCall,
          hasActivePlan: callStatus.hasActivePlan,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: `Services for ${serviceFor} fetched successfully`,
      data: servicesWithCallStatus,
      count: servicesWithCallStatus.length,
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
    const userId = (req as any).user?.id || null;

    const service = await SupportService.findById(id).populate("createdBy", "name email");

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Support service not found",
      });
    }

    // Add canCall and hasActivePlan
    const callStatus = await getCallStatusForService(userId, id);
    const serviceData = {
      ...service.toObject(),
      canCall: callStatus.canCall,
      hasActivePlan: callStatus.hasActivePlan,
    };

    return res.status(200).json({
      success: true,
      message: "Support service fetched successfully",
      data: serviceData,
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
    let { title, subtitle, description, serviceFor, status, order } = req.body;

    console.log("Update Request Received:", { 
      id, 
      title, 
      subtitle, 
      description, 
      serviceFor, 
      status, 
      order 
    });

    // Normalize status to lowercase
    if (status !== undefined && typeof status === 'string') {
      status = status.toLowerCase();
    }

    // Parse order as integer if provided
    if (order !== undefined && order !== null) {
      const parsedOrder = parseInt(String(order), 10);
      order = isNaN(parsedOrder) ? undefined : parsedOrder;
      console.log("Parsed Order:", order);
    }

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
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (description !== undefined) updateData.description = description;
    if (serviceFor !== undefined) updateData.serviceFor = serviceFor;
    if (status !== undefined) updateData.status = status;
    if (order !== undefined) updateData.order = order;
    updateData.updatedBy = (req as any).user?._id;

    console.log("Update Data to save:", updateData);

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

    console.log("Updated Service:", updatedService);

    return res.status(200).json({
      success: true,
      message: "Support service updated successfully",
      data: updatedService,
    });
  } catch (error: any) {
    console.error("Update error:", error.message);
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
    const userId = (req as any).user?.id || null;

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

    // Add canCall and hasActivePlan for each service
    const servicesWithCallStatus = await Promise.all(
      services.map(async (service: any) => {
        const callStatus = await getCallStatusForService(userId, service._id.toString());
        return {
          ...service,
          canCall: callStatus.canCall,
          hasActivePlan: callStatus.hasActivePlan,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Support services search results",
      data: servicesWithCallStatus,
      count: servicesWithCallStatus.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error searching support services",
    });
  }
};
