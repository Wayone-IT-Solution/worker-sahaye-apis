import { ObjectId } from "mongodb";
import mongoose from "mongoose";

/**
 * 🟢 Build the MongoDB aggregation pipeline based on query filters
 * @param {Record<string, any>} query - The query parameters to build the pipeline from
 * @returns {Object} - The constructed pipeline and matching stage
 */
export const getPipeline = (query: any): any => {
  const {
    user,
    type,
    status,
    endDate,
    assignee,
    page = 1,
    startDate,
    searchkey,
    limit = 10,
    search = "",
    sortDir = "desc",
    sortKey = "createdAt",
  } = query;

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  const pipeline: any[] = [];
  const matchStage: Record<string, any> = {};

  if (type) matchStage.type = type;
  if (status) matchStage.status = status;
  if (user) matchStage.user = new ObjectId(user);
  if (assignee) matchStage.assignee = new ObjectId(assignee);

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

const EARTH_RADIUS_KM = 6371; // Radius of Earth in kilometers

const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Calculates the distance in kilometers between two geographic coordinates
 * using the Haversine formula.
 *
 * @param from - Tuple [longitude, latitude] for the starting point.
 * @param to - Tuple [longitude, latitude] for the destination point.
 * @returns Distance in kilometers.
 */
export const calculateDistance = (
  from: [number, number],
  to: [number, number]
): number => {
  if (
    !Array.isArray(from) ||
    !Array.isArray(to) ||
    from.length !== 2 ||
    to.length !== 2
  ) {
    throw new Error(
      "Invalid coordinate format. Expected [longitude, latitude]."
    );
  }

  const [lon1, lat1] = from;
  const [lon2, lat2] = to;

  if (
    [lon1, lat1, lon2, lat2].some(
      (val) => typeof val !== "number" || isNaN(val)
    )
  ) {
    throw new Error("Coordinates must be valid numbers.");
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;
  return Math.round(distance * 1000) / 1000; // Round to 3 decimal places
};

export const calculateFare = (
  distanceKm: number,
  type: "suv" | "sedan" | "bike" | "auto" | "scooter" | "car"
): number => {
  let baseFare = 0;
  let perKmRate = 0;

  switch (type) {
    case "suv":
      baseFare = 100;
      perKmRate = 18;
      break;
    case "sedan":
      baseFare = 80;
      perKmRate = 15;
      break;
    case "car": // general car
      baseFare = 70;
      perKmRate = 12;
      break;
    case "auto":
      baseFare = 40;
      perKmRate = 10;
      break;
    case "bike":
      baseFare = 30;
      perKmRate = 7;
      break;
    case "scooter":
      baseFare = 25;
      perKmRate = 6;
      break;
    default:
      baseFare = 50;
      perKmRate = 10;
      break;
  }

  return Math.round(baseFare + distanceKm * perKmRate);
};
