import mongoose from "mongoose";
import { toBoolean } from "validator";
import { logger } from "../config/logger";

const { ObjectId } = mongoose.Types;

const isEmptyValue = (val: any): boolean =>
  val === null || val === undefined || val === "";

const parsePositiveInt = (value: any, fallback: number): number => {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
};

const toDebugBoolean = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (isEmptyValue(value)) return false;
  return toBoolean(String(value));
};

const safeJSONStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getStageName = (stage: Record<string, any>): string =>
  Object.keys(stage ?? {})[0] || "unknown";

/**
 * Build the MongoDB aggregation pipeline based on query filters
 * @param {Record<string, any>} query - Query filters with pagination, search, projection, sort
 * @param {Array|Object} additionalStages - Optional extra aggregation stages
 * @returns {Object} - { pipeline, matchStage, options }
 */
export const getPipeline = (
  query: Record<string, any>,
  additionalStages?: any[] | Record<string, any>
) => {
  const {
    // Legacy/common filters (kept for backward compatibility)
    _id,
    user,
    type,
    status,
    userId,
    endDate,
    isActive,
    postedBy,
    assignee,
    userType,
    stateId,
    featureId,
    assistant,
    createdBy,
    startDate,
    community,
    countryId,
    employerId,
    applicantId,
    requestModel,

    // Pagination & search controls
    page = 1,
    limit = 10,
    pagination = "true",
    countMode = "auto", // 'auto' | 'matchOnly'

    search = "",
    searchkey = "",
    searchOperator = "or", // 'or' | 'and'
    searchMode = "contains", // 'contains' | 'prefix' | 'exact'

    // Sorting
    multiSort = "", // "field1:asc,field2:desc"
    sortDir = "desc",
    sortKey = "createdAt",

    // Projection
    fields = "",
    exclude = "",

    // Special filters
    exists = "",
    notExists = "",
    applyCollation = "true",
    debug = "false",
    debugPipeline = "false",
    requestId = "",
    traceId = "",

    ...filters
  } = query;

  const pageNumber = parsePositiveInt(page, 1);
  const limitNumber = parsePositiveInt(limit, 10);
  const usePagination = toBoolean(String(pagination));
  const basePipeline: any[] = [];
  const dataPipelineStages: any[] = [];
  const match: Record<string, any> = {};
  const normalizeStages = (stages: any): any[] => {
    if (Array.isArray(stages)) return stages;
    if (stages && typeof stages === "object") return [stages];
    return [];
  };
  const hasStructuredAdditionalStages =
    Boolean(additionalStages) &&
    !Array.isArray(additionalStages) &&
    typeof additionalStages === "object" &&
    (Object.prototype.hasOwnProperty.call(additionalStages, "beforePagination") ||
      Object.prototype.hasOwnProperty.call(additionalStages, "afterPagination"));
  const beforePaginationStages = hasStructuredAdditionalStages
    ? normalizeStages((additionalStages as any).beforePagination)
    : normalizeStages(additionalStages);
  const afterPaginationStages = hasStructuredAdditionalStages
    ? normalizeStages((additionalStages as any).afterPagination)
    : [];

  const debugEnabled =
    toDebugBoolean(debugPipeline) ||
    toDebugBoolean(debug) ||
    toDebugBoolean(process.env.COMMON_SERVICE_DEBUG);
  const traceRef = String(traceId || requestId || "n/a");
  const logDebug = (message: string, payload?: Record<string, unknown>) => {
    if (!debugEnabled) return;
    const suffix = payload ? ` | ${safeJSONStringify(payload)}` : "";
    logger.info(`[CommonService:getPipeline][trace:${traceRef}] ${message}${suffix}`);
  };

  /**
   * Safely convert to ObjectId if valid
   */
  const safeObjectId = (val: any): mongoose.Types.ObjectId | any => {
    if (typeof val === "string" && ObjectId.isValid(val)) {
      return new ObjectId(val);
    }
    return val;
  };

  const normalizeActive = (val: any) => {
    if (["true", true, "active", 1, "1"].includes(val)) return true;
    if (["false", false, "inactive", 0, "0"].includes(val)) return false;
    return val;
  };

  /**
   * Check if value is truly empty (null, undefined, empty string)
   */
  const isEmpty = (val: any): boolean => {
    return isEmptyValue(val);
  };

  /**
   * Parse string to appropriate type
   */
  const parseValue = (value: any): any => {
    if (isEmpty(value)) return null;

    // Boolean
    if (value === "true") return true;
    if (value === "false") return false;

    // Number
    if (!isNaN(value) && value !== "" && typeof value !== "boolean") {
      return Number(value);
    }

    // Date (ISO format)
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date;
    }

    // ObjectId
    if (typeof value === "string" && ObjectId.isValid(value)) {
      return safeObjectId(value);
    }

    // Array (comma- or pipe-separated)
    if (typeof value === "string" && /[,|]/.test(value)) {
      return value
        .split(/[,|]/)
        .map((v) => parseValue(v.trim()))
        .filter((v) => !isEmpty(v));
    }

    return value;
  };

  /**
   * Handle special operators in field names
   * Examples: price__gte, status__in, createdAt__exists
   */
  const parseFieldOperator = (
    key: string,
    value: any
  ): { field: string; operator: string; value: any } => {
    const parts = key.split("__");
    const field = parts[0];
    const operator = parts[1] || "eq";

    const parsedValue = parseValue(value);

    switch (operator) {
      case "in":
        return {
          field,
          operator: "$in",
          value: Array.isArray(parsedValue) ? parsedValue : [parsedValue],
        };
      case "nin":
        return {
          field,
          operator: "$nin",
          value: Array.isArray(parsedValue) ? parsedValue : [parsedValue],
        };
      case "gte":
        return { field, operator: "$gte", value: parsedValue };
      case "gt":
        return { field, operator: "$gt", value: parsedValue };
      case "lte":
        return { field, operator: "$lte", value: parsedValue };
      case "lt":
        return { field, operator: "$lt", value: parsedValue };
      case "ne":
        return { field, operator: "$ne", value: parsedValue };
      case "exists":
        return { field, operator: "$exists", value: parsedValue === true };
      case "regex":
        return {
          field,
          operator: "$regex",
          value: new RegExp(value, "i"),
        };
      default:
        return { field, operator: "eq", value: parsedValue };
    }
  };

  /**
   * Set nested match dynamically with multi-level support
   * Supports: user.profile.name, items.0.price, tags.*
   */
  const setNestedMatch = (
    obj: any,
    key: string,
    operator: string,
    value: any
  ) => {
    const keys = key.split(".");
    let current = obj;

    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        // Last key - apply the value
        if (operator === "eq") {
          // Multi-value filters should behave like $in.
          if (Array.isArray(value)) {
            current[k] = { $in: value };
          } else if (typeof value === "string" && operator === "eq") {
            current[k] = { $regex: new RegExp(`^${value}$`, "i") };
          } else {
            current[k] = value;
          }
        } else {
          // For other operators
          current[k] = { [operator]: value };
        }
      } else {
        // Nested path - create if doesn't exist
        if (!current[k]) {
          current[k] = {};
        }
        current = current[k];
      }
    });
  };

  // ==========================================
  // BUILD MATCH STAGE (legacy filters)
  // ==========================================

  const legacyFilters = {
    _id,
    user,
    type,
    status,
    userId,
    stateId,
    postedBy,
    assignee,
    userType,
    featureId,
    assistant,
    createdBy,
    community,
    countryId,
    employerId,
    applicantId,
    requestModel,
  };

  Object.entries(legacyFilters).forEach(([key, value]) => {
    if (!isEmpty(value)) setNestedMatch(match, key, "eq", safeObjectId(value));
  });

  if (!isEmpty(isActive)) {
    setNestedMatch(match, "isActive", "eq", normalizeActive(isActive));
  }

  if (startDate || endDate) {
    match.createdAt = match.createdAt || {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  if (Object.keys(match).length) basePipeline.push({ $match: match });

  // ==========================================
  // ADDITIONAL STAGES (Lookups, etc.)
  // ==========================================
  if (beforePaginationStages.length) {
    basePipeline.push(...beforePaginationStages);
  }

  // ==========================================
  // ADVANCED SEARCH
  // ==========================================
  if (search && searchkey) {
    const parseSearchValues = (searchParam: any): string[] => {
      if (Array.isArray(searchParam)) {
        return searchParam
          .map((value) => String(value).trim())
          .filter(Boolean);
      }
      const normalizedValue = String(searchParam).trim();
      return normalizedValue ? [normalizedValue] : [];
    };
    const searchValues = parseSearchValues(search);
    const normalizedSearchOperator =
      String(searchOperator).toLowerCase() === "and" ? "and" : "or";
    const normalizedSearchMode = ["contains", "prefix", "exact"].includes(
      String(searchMode).toLowerCase()
    )
      ? String(searchMode).toLowerCase()
      : "contains";

    // Handle searchkey as either string or array (from duplicate query params)
    let keysArray: string[] = [];

    if (Array.isArray(searchkey)) {
      keysArray = searchkey.reduce((acc: string[], keyPart: string) => {
        String(keyPart)
          .split(",")
          .forEach((keyToken) => {
            const token = keyToken.trim();
            if (token) acc.push(token);
          });
        return acc;
      }, []);
    } else if (typeof searchkey === "string") {
      keysArray = searchkey
        .split(",")
        .map((k: string) => k.trim())
        .filter(Boolean);
    }

    keysArray = Array.from(new Set(keysArray));

    if (keysArray.length > 0 && searchValues.length > 0) {
      const hasExplicitSearchOperator =
        Object.prototype.hasOwnProperty.call(query, "searchOperator") &&
        !isEmpty(query.searchOperator);
      const pairedSearchMode =
        searchValues.length > 1 && searchValues.length === keysArray.length;
      const effectiveSearchOperator =
        !hasExplicitSearchOperator && pairedSearchMode
          ? "and"
          : normalizedSearchOperator;

      const buildSearchRegex = (rawValue: string): RegExp => {
        let regexPattern = escapeRegex(rawValue);
        if (normalizedSearchMode === "prefix") regexPattern = `^${regexPattern}`;
        if (normalizedSearchMode === "exact") regexPattern = `^${regexPattern}$`;
        return new RegExp(regexPattern, "i");
      };

      let searchConditions: Record<string, any>[] = [];
      if (pairedSearchMode) {
        searchConditions = keysArray.map((key: string, index: number) => ({
          [key]: buildSearchRegex(searchValues[index]),
        }));
      } else if (searchValues.length === 1) {
        searchConditions = keysArray.map((key: string) => ({
          [key]: buildSearchRegex(searchValues[0]),
        }));
      } else if (keysArray.length === 1) {
        searchConditions = searchValues.map((value: string) => ({
          [keysArray[0]]: buildSearchRegex(value),
        }));
      } else {
        searchConditions = keysArray.map((key: string, index: number) => ({
          [key]:
            buildSearchRegex(
              searchValues[index] ?? searchValues[0] ?? ""
            ),
        }));
      }

      const searchQuery =
        effectiveSearchOperator === "and"
          ? { $and: searchConditions }
          : { $or: searchConditions };

      basePipeline.push({ $match: searchQuery });
      logDebug("Added search match stage", {
        searchValues,
        searchOperator: effectiveSearchOperator,
        searchMode: normalizedSearchMode,
        searchKeys: keysArray,
        pairedSearchMode,
      });
    } else {
      logDebug("Skipped search match stage due to invalid search/searchkey", {
        search,
        searchkey,
      });
    }
  }

  // Process all dynamic filters
  for (const key in filters) {
    const value = filters[key];

    if (isEmpty(value)) continue;

    const {
      field,
      operator,
      value: parsedValue,
    } = parseFieldOperator(key, value);

    setNestedMatch(match, field, operator, parsedValue);
  }

  // Exists/Not Exists
  if (exists) {
    exists.split(",").forEach((field: string) => {
      setNestedMatch(match, field.trim(), "$exists", true);
    });
  }

  if (notExists) {
    notExists.split(",").forEach((field: string) => {
      setNestedMatch(match, field.trim(), "$exists", false);
    });
  }

  if (Object.keys(match).length) {
    // Ensure latest match is applied before projections/lookups
    const firstMatchIndex = basePipeline.findIndex((stage) => stage.$match);
    if (firstMatchIndex === -1) basePipeline.unshift({ $match: match });
    else basePipeline[firstMatchIndex] = { $match: match };
  }

  logDebug("Prepared match filters", {
    matchKeys: Object.keys(match),
    dynamicFilterKeys: Object.keys(filters),
    hasDateRange: Boolean(startDate || endDate),
  });

  // ==========================================
  // PROJECTION
  // ==========================================
  if (fields || exclude) {
    const projectFields: any = {};

    // Include specific fields
    if (fields) {
      fields.split(",").forEach((f: string) => {
        const field = f.trim();
        if (field) projectFields[field] = 1;
      });
    }

    // Exclude specific fields
    if (exclude) {
      exclude.split(",").forEach((f: string) => {
        const field = f.trim();
        if (field) projectFields[field] = 0;
      });
    }

    if (Object.keys(projectFields).length > 0) {
      dataPipelineStages.push({ $project: projectFields });
    }
  }

  // ==========================================
  // SORTING
  // ==========================================
  const hasSortInAdditionalStages = beforePaginationStages.some(
    (stage) => stage && typeof stage === "object" && stage.$sort
  );
  const hasExplicitSort =
    (Object.prototype.hasOwnProperty.call(query, "multiSort") &&
      !isEmpty(query.multiSort)) ||
    (Object.prototype.hasOwnProperty.call(query, "sortDir") &&
      !isEmpty(query.sortDir)) ||
    (Object.prototype.hasOwnProperty.call(query, "sortKey") &&
      !isEmpty(query.sortKey));
  const shouldApplyInternalSort = hasExplicitSort || !hasSortInAdditionalStages;
  const sortStage: Record<string, 1 | -1> = {};

  if (shouldApplyInternalSort) {
    // Multi-field sorting: "price:asc,createdAt:desc"
    if (multiSort) {
      multiSort.split(",").forEach((s: string) => {
        const [field, direction] = s.trim().split(":");
        if (field) {
          sortStage[field] = direction === "asc" ? 1 : -1;
        }
      });
    } else {
      // Single field sorting
      // Handle both numeric (1, -1) and string ("asc", "desc") formats
      let sortDirection: 1 | -1 = -1;
      if (sortDir === "asc" || sortDir === "1" || sortDir === 1) {
        sortDirection = 1;
      } else if (sortDir === "desc" || sortDir === "-1" || sortDir === -1) {
        sortDirection = -1;
      }
      sortStage[sortKey] = sortDirection;
    }
  }

  if (Object.keys(sortStage).length > 0) {
    dataPipelineStages.push({ $sort: sortStage });
  }

  // ==========================================
  // PAGINATION
  // ==========================================
  let pipeline: any[] = [];
  let countPipeline: any[] = [];

  if (usePagination) {
    pipeline = [
      ...basePipeline,
      ...dataPipelineStages,
      { $skip: (pageNumber - 1) * limitNumber },
      { $limit: limitNumber },
      ...afterPaginationStages,
    ];
    const normalizedCountMode = String(countMode).toLowerCase();
    if (normalizedCountMode === "matchonly" || normalizedCountMode === "match_only") {
      const matchOnlyStages = basePipeline.filter(
        (stage) => stage && typeof stage === "object" && stage.$match
      );
      countPipeline = [
        ...(matchOnlyStages.length ? matchOnlyStages : []),
        { $count: "total" },
      ];
    } else {
      countPipeline = [...basePipeline, { $count: "total" }];
    }
  } else {
    pipeline = [...basePipeline, ...dataPipelineStages, ...afterPaginationStages];
  }

  // ==========================================
  // RETURN PIPELINE
  // ==========================================
  const options: Record<string, any> = {
    allowDiskUse: true,
  };

  if (toBoolean(String(applyCollation))) {
    options.collation = { locale: "en", strength: 2 };
  }

  logDebug("Generated pipeline", {
    pagination: usePagination,
    hasAdditionalStages:
      beforePaginationStages.length > 0 || afterPaginationStages.length > 0,
    sortAppliedInternally: shouldApplyInternalSort,
    countMode: String(countMode),
    baseStages: basePipeline.map((stage) => getStageName(stage)),
    dataStages: dataPipelineStages.map((stage) => getStageName(stage)),
    afterPaginationStages: afterPaginationStages.map((stage) => getStageName(stage)),
    countStages: countPipeline.map((stage) => getStageName(stage)),
    finalStages: pipeline.map((stage) => getStageName(stage)),
    optionKeys: Object.keys(options),
  });

  return {
    pipeline,
    countPipeline,
    matchStage: match,
    options,
  };
};

/**
 * Format the result with pagination info
 * @param {number} pageNumber - Current page number
 * @param {number} limitNumber - Number of items per page
 * @param {number} totalResults - Total number of items
 * @param {Array<any>} results - The result set
 * @returns {Object} - The paginated result with pagination metadata
 */
export const paginationResult = (
  pageNumber: number,
  limitNumber: number,
  totalResults: number,
  results: any[]
) => {
  return {
    result: results,
    pagination: {
      currentPage: pageNumber,
      totalItems: totalResults,
      itemsPerPage: limitNumber,
      totalPages: Math.ceil(totalResults / limitNumber),
    },
  };
};

/**
 * Convert a string to a valid MongoDB ObjectId
 * @param {string} id - The string to convert
 * @returns {ObjectId | null} - The ObjectId or null if invalid
 */
export const convertToObjectId = (
  id: string
): mongoose.Types.ObjectId | null => {
  try {
    return new ObjectId(id);
  } catch (error) {
    console.log("Invalid ObjectId:", error);
    return null;
  }
};

/**
 * Check if a string is a valid MongoDB ObjectId
 * @param {string} id - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidObjectId = (id: string): boolean => {
  try {
    return ObjectId.isValid(id);
  } catch (error) {
    return false;
  }
};

/**
 * Check if a string is a valid UUID
 * @param {string} uuid - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Check if a string is a valid email
 * @param {string} email - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Check if a string is a valid URL
 * @param {string} url - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidURL = (url: string): boolean => {
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9.-]+)(:[0-9]+)?(\/[^\s]*)?$/;
  return urlRegex.test(url);
};

/**
 * Check if a string is a valid phone number
 * @param {string} phone - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

/**
 * Check if a string is a valid date
 * @param {string} date - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

/**
 * Check if a string is a valid time
 * @param {string} time - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

/**
 * Check if a string is a valid datetime
 * @param {string} datetime - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidDateTime = (datetime: string): boolean => {
  const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
  return datetimeRegex.test(datetime);
};

/**
 * Check if a string is a valid JSON
 * @param {string} jsonString - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidJSON = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (error) {
    return false;
  }
};
