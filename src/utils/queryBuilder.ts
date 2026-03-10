/**
 * Build MongoDB match stage with filters, search, and date range
 */
import mongoose from "mongoose";

const safeObjectId = (id: any) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
};

export const buildMatchStage = (
  params: {
    status?: string;
    search?: string;
    searchKey?: string;
    startDate?: string;
    endDate?: string;
    industryId?: string;
    serviceId?: string;
    categoryId?: string;
    headerId?: string;
  },
  searchFields?: Record<string, string[]>,
): any => {
  const matchStage: any = {};

  // Add exact match filters
  if (params.status) {
    matchStage.status = params.status;
  }
  if (params.industryId) {
    matchStage.industryId = safeObjectId(params.industryId);
  }
  if (params.serviceId) {
    matchStage.serviceId = safeObjectId(params.serviceId);
  }
  if (params.categoryId) {
    matchStage.category = safeObjectId(params.categoryId);
  }
  if (params.headerId) {
    matchStage.header = safeObjectId(params.headerId);
  }

  // Search functionality with custom field mapping
  if (params.search && params.searchKey && searchFields) {
    const fields = searchFields[params.searchKey];
    if (fields && fields.length > 0) {
      if (fields.length === 1) {
        // Single field search
        matchStage[fields[0]] = { $regex: params.search, $options: "i" };
      } else {
        // Multiple fields search
        matchStage.$or = fields.map((field) => ({
          [field]: { $regex: params.search, $options: "i" },
        }));
      }
    }
  }

  // Date range filtering
  if (params.startDate || params.endDate) {
    matchStage.createdAt = {};
    if (params.startDate) {
      matchStage.createdAt.$gte = new Date(params.startDate);
    }
    if (params.endDate) {
      matchStage.createdAt.$lte = new Date(params.endDate);
    }
  }

  return matchStage;
};

/**
 * Build MongoDB sort object
 */
export const buildSortObject = (
  sortKey?: string,
  sortDir?: string | number,
  defaultSort: Record<string, 1 | -1> = { createdAt: -1 },
): Record<string, 1 | -1> => {
  if (sortKey && sortDir) {
    return {
      [sortKey]: parseInt(String(sortDir)) === -1 ? -1 : 1,
    };
  }
  return defaultSort;
};

/**
 * Build pagination response
 */
export const buildPaginationResponse = (
  data: any[],
  total: number,
  page: number,
  limit: number,
) => {
  const totalPages = Math.ceil(total / limit);
  return {
    result: data,
    pagination: {
      totalItems: total,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
    },
  };
};

/**
 * Search field mappings for different controllers
 */
export const SEARCH_FIELD_MAP = {
  servicelocation: {
    address: ["address"],
    locationType: ["locationType"],
    status: ["status"],
    state: ["state"],
    city: ["city"],
  },
  designation: {
    name: ["name"],
    description: ["description"],
    status: ["status"],
    workerCategory: ["workerCategoryId.type"],
  },
  subindustry: {
    name: ["name"],
    description: ["description"],
    status: ["status"],
  },
  industry: {
    name: ["name"],
    description: ["description"],
    status: ["status"],
  },
  jobrole: {
    name: ["name"],
    description: ["description"],
    slug: ["slug"],
    status: ["status"],
  },
  header: {
    title: ["title"],
    description: ["description"],
    status: ["status"],
  },
  pdffile: {
    header: ["header"],
  },
  loansupport: {
    fullName: ["fullName"],
    email: ["email"],
    phone: ["phone"],
    employerName: ["employerName"],
  },
  educationfield: {
    name: ["name"],
    description: ["description"],
    status: ["status"],
  },
  supportservice: {
    title: ["title"],
    subtitle: ["subtitle"],
    description: ["description"],
    status: ["status"],
    serviceFor: ["serviceFor"],
  },
};
