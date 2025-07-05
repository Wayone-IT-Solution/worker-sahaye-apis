import { ObjectId } from "mongodb";

/**
 * 🟢 Build the MongoDB aggregation pipeline based on query filters
 * @param {Record<string, any>} query - The query parameters to build the pipeline from
 * @returns {Object} - The constructed pipeline and matching stage
 */
export const getPipeline = (query: any, optionsToBeExtract?: any): any => {
  const {
    _id,
    user,
    type,
    status,
    userId,
    endDate,
    assignee,
    postedBy,
    page = 1,
    createdBy,
    startDate,
    community,
    searchkey,
    limit = 10,
    search = "",
    applicantId,
    sortDir = "desc",
    sortKey = "createdAt",
  } = query;

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  const pipeline: any[] = [];
  const matchStage: Record<string, any> = {};

  if (type) matchStage.type = type;
  if (status) matchStage.status = status;
  if (_id) matchStage._id = new ObjectId(_id);
  if (user) matchStage.user = new ObjectId(user);
  if (userId) matchStage.userId = new ObjectId(userId);
  if (postedBy) matchStage.postedBy = new ObjectId(postedBy);
  if (assignee) matchStage.assignee = new ObjectId(assignee);
  if (community) matchStage.community = new ObjectId(community);
  if (createdBy) matchStage.createdBy = new ObjectId(createdBy);
  if (applicantId) matchStage.applicant = new ObjectId(applicantId);

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  // Push match stage if anything exists
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // Handle search with regex
  if (search && searchkey === "_id") {
    pipeline.push({ $addFields: { idStr: { $toString: "$_id" } } });
    pipeline.push({ $match: { idStr: { $regex: search, $options: "i" } } });
    pipeline.push({ $project: { idStr: 0 } });
  } else if (search && searchkey === "category") {
    pipeline.push({ $addFields: { idStr: { $toString: "$category" } } });
    pipeline.push({ $match: { idStr: { $regex: search, $options: "i" } } });
    pipeline.push({ $project: { idStr: 0 } });
  } else if (search && searchkey) {
    pipeline.push({
      $match: { [searchkey]: { $regex: search, $options: "i" } },
    });
  }

  // Sorting
  pipeline.push({
    $sort: { [sortKey]: sortDir === "asc" ? 1 : -1 },
  });

  // Pagination
  pipeline.push({ $skip: (pageNumber - 1) * limitNumber });
  pipeline.push({ $limit: limitNumber });

  if (Array.isArray(optionsToBeExtract)) pipeline.push(...optionsToBeExtract);
  else if (
    typeof optionsToBeExtract === "object" &&
    optionsToBeExtract !== null
  )
    pipeline.push(optionsToBeExtract);

  const options = { collation: { locale: "en", strength: 2 } };
  return { pipeline, matchStage, options };
};

/**
 * 🟢 Format the result with pagination info
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
 * 🟢 Convert a string to a valid MongoDB ObjectId
 * @param {string} id - The string to convert
 * @returns {ObjectId | null} - The ObjectId or null if invalid
 */
export const convertToObjectId = (id: string): ObjectId | null => {
  try {
    return new ObjectId(id);
  } catch (error) {
    console.log("Invalid ObjectId:", error);
    return null;
  }
};

/**
 * 🟢 Check if a string is a valid MongoDB ObjectId
 * @param {string} id - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidObjectId = (id: string): boolean => {
  try {
    new ObjectId(id);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 🟢 Check if a string is a valid UUID
 * @param {string} uuid - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * 🟢 Check if a string is a valid email
 * @param {string} email - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * 🟢 Check if a string is a valid URL
 * @param {string} url - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidURL = (url: string): boolean => {
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9.-]+)(:[0-9]+)?(\/[^\s]*)?$/;
  return urlRegex.test(url);
};

/**
 * 🟢 Check if a string is a valid phone number
 * @param {string} phone - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
  return phoneRegex.test(phone);
};

/**
 * 🟢 Check if a string is a valid date
 * @param {string} date - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
  if (!dateRegex.test(date)) return false;

  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

/**
 * 🟢 Check if a string is a valid time
 * @param {string} time - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm format
  return timeRegex.test(time);
};

/**
 * 🟢 Check if a string is a valid datetime
 * @param {string} datetime - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidDateTime = (datetime: string): boolean => {
  const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/; // ISO 8601 format
  return datetimeRegex.test(datetime);
};

/**
 * 🟢 Check if a string is a valid JSON
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
