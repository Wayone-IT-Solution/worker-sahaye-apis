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

const parseQueryValue = (value: any) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "string" && /[,|]/.test(value)) {
    return value
      .split(/[,|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
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
    const parsedStatus = parseQueryValue(params.status);
    matchStage.status = Array.isArray(parsedStatus)
      ? { $in: parsedStatus }
      : parsedStatus;
  }
  if (params.industryId) {
    const parsedIndustry = parseQueryValue(params.industryId);
    matchStage.industryId = Array.isArray(parsedIndustry)
      ? { $in: parsedIndustry.map(safeObjectId) }
      : safeObjectId(parsedIndustry);
  }
  if (params.serviceId) {
    const parsedService = parseQueryValue(params.serviceId);
    matchStage.serviceId = Array.isArray(parsedService)
      ? { $in: parsedService.map(safeObjectId) }
      : safeObjectId(parsedService);
  }
  if (params.categoryId) {
    const parsedCategory = parseQueryValue(params.categoryId);
    matchStage.category = Array.isArray(parsedCategory)
      ? { $in: parsedCategory.map(safeObjectId) }
      : safeObjectId(parsedCategory);
  }
  if (params.headerId) {
    const parsedHeader = parseQueryValue(params.headerId);
    matchStage.header = Array.isArray(parsedHeader)
      ? { $in: parsedHeader.map(safeObjectId) }
      : safeObjectId(parsedHeader);
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
