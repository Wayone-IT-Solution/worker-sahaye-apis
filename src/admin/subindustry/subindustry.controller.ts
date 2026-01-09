import { Request, Response } from "express";
import SubIndustry from "../../modals/subindustry.model";
import Industry from "../../modals/industry.model";

// Create a new sub-industry
export const createSubIndustry = async (req: Request, res: Response) => {
  try {
    const { name, description, icon, industryId } = req.body;

    // Validation
    if (!name || !industryId) {
      return res.status(400).json({
        success: false,
        message: "Name and industryId are required",
      });
    }

    // Check if industry exists
    const industry = await Industry.findById(industryId);
    if (!industry) {
      return res.status(404).json({
        success: false,
        message: "Industry not found",
      });
    }

    // Check if sub-industry with same name already exists for this industry
    const existingSubIndustry = await SubIndustry.findOne({
      industryId,
      name: name.trim(),
    });

    if (existingSubIndustry) {
      return res.status(400).json({
        success: false,
        message: "Sub-industry with this name already exists for this industry",
      });
    }

    const newSubIndustry = await SubIndustry.create({
      name: name.trim(),
      description: description?.trim() || null,
      icon: icon?.trim() || null,
      industryId,
      createdBy: (req as any).user?._id,
    });

    await newSubIndustry.populate("industryId", "name icon");

    return res.status(201).json({
      success: true,
      message: "Sub-industry created successfully",
      data: newSubIndustry,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error creating sub-industry",
    });
  }
};

// Get all sub-industries for a specific industry
export const getSubIndustriesByIndustry = async (req: Request, res: Response) => {
  try {
    const { industryId } = req.params;
    const status = req.query.status as string;

    if (!industryId) {
      return res.status(400).json({
        success: false,
        message: "industryId is required",
      });
    }

    // Check if industry exists
    const industry = await Industry.findById(industryId);
    if (!industry) {
      return res.status(404).json({
        success: false,
        message: "Industry not found",
      });
    }

    const matchStage: any = { industryId };
    if (status) {
      matchStage.status = status;
    }

    const subIndustries = await SubIndustry.find(matchStage)
      .populate("industryId", "name icon")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Sub-industries fetched successfully",
      data: subIndustries,
      count: subIndustries.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching sub-industries",
    });
  }
};

// Get all sub-industries with pagination
export const getAllSubIndustries = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const industryId = req.query.industryId as string;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    const matchStage: any = {};
    if (industryId) {
      matchStage.industryId = industryId;
    }
    if (status) {
      matchStage.status = status;
    }

    const total = await SubIndustry.countDocuments(matchStage);
    const subIndustries = await SubIndustry.find(matchStage)
      .populate("industryId", "name icon")
      .populate("createdBy updatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Sub-industries fetched successfully",
      data: subIndustries,
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
      message: error.message || "Error fetching sub-industries",
    });
  }
};

// Get sub-industry by ID
export const getSubIndustryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subIndustry = await SubIndustry.findById(id)
      .populate("industryId", "name icon description")
      .populate("createdBy updatedBy", "name email");

    if (!subIndustry) {
      return res.status(404).json({
        success: false,
        message: "Sub-industry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sub-industry fetched successfully",
      data: subIndustry,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching sub-industry",
    });
  }
};

// Update sub-industry
export const updateSubIndustry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, icon, status } = req.body;

    if (!name && !description && !icon && !status) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required to update",
      });
    }

    const subIndustry = await SubIndustry.findById(id);
    if (!subIndustry) {
      return res.status(404).json({
        success: false,
        message: "Sub-industry not found",
      });
    }

    // Check for duplicate name if updating name
    if (name && name !== subIndustry.name) {
      const duplicate = await SubIndustry.findOne({
        industryId: subIndustry.industryId,
        name: name.trim(),
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Sub-industry with this name already exists for this industry",
        });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (description) updateData.description = description.trim();
    if (icon) updateData.icon = icon.trim();
    if (status) updateData.status = status;
    updateData.updatedBy = (req as any).user?._id;

    const updatedSubIndustry = await SubIndustry.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("industryId", "name icon")
      .populate("createdBy updatedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Sub-industry updated successfully",
      data: updatedSubIndustry,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error updating sub-industry",
    });
  }
};

// Delete sub-industry
export const deleteSubIndustry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedSubIndustry = await SubIndustry.findByIdAndDelete(id);

    if (!deletedSubIndustry) {
      return res.status(404).json({
        success: false,
        message: "Sub-industry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sub-industry deleted successfully",
      data: deletedSubIndustry,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error deleting sub-industry",
    });
  }
};
