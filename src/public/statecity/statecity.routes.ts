import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { StateCityController } from "./statecity.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { invalidateCacheAfterSuccess } from "../../middlewares/cacheMiddleware";

const {
  // Country
  createCountry,
  getAllCountries,
  getCountryById,
  updateCountryById,
  deleteCountryById,

  // State
  createState,
  getAllStates,
  getStateById,
  updateStateById,
  deleteStateById,

  // City
  createCity,
  getAllCity,
  getCityById,
  updateCityById,
  deleteCityById,

  // Combined
  createStateCity,
  getAllStateCitys,

  // Public
  getPublicLocationData,
} = StateCityController;

const router = express.Router();

// ==============================
// 🌍 Country Routes
// ==============================
router.post("/country", authenticateToken, invalidateCacheAfterSuccess("Country", { logLabel: "country-create" }), asyncHandler(createCountry));
router.get("/country", authenticateToken, asyncHandler(getAllCountries));
router.get("/country/:id", authenticateToken, asyncHandler(getCountryById));
router.put("/country/:id", authenticateToken, invalidateCacheAfterSuccess("Country", { logLabel: "country-update" }), asyncHandler(updateCountryById));
router.delete(
  "/country/:id",
  authenticateToken,
  invalidateCacheAfterSuccess("Country", { logLabel: "country-delete" }),
  asyncHandler(deleteCountryById),
);

// ==============================
// 📍 State Routes
// ==============================
router.post("/state", authenticateToken, invalidateCacheAfterSuccess("State", { logLabel: "state-create" }), asyncHandler(createState));
router.get("/state", asyncHandler(getAllStates));
router.get("/state/:id", authenticateToken, asyncHandler(getStateById));
router.put("/state/:id", authenticateToken, invalidateCacheAfterSuccess("State", { logLabel: "state-update" }), asyncHandler(updateStateById));
router.delete("/state/:id", authenticateToken, invalidateCacheAfterSuccess("State", { logLabel: "state-delete" }), asyncHandler(deleteStateById));

// ==============================
// 🏙️ City Routes
// ==============================
router.post("/city", authenticateToken, invalidateCacheAfterSuccess("City", { logLabel: "city-create" }), asyncHandler(createCity));
router.get("/city", asyncHandler(getAllCity));
router.get("/city/:id", authenticateToken, asyncHandler(getCityById));
router.put("/city/:id", authenticateToken, invalidateCacheAfterSuccess("City", { logLabel: "city-update" }), asyncHandler(updateCityById));
router.delete("/city/:id", authenticateToken, invalidateCacheAfterSuccess("City", { logLabel: "city-delete" }), asyncHandler(deleteCityById));

// ==============================
// 🌐 Combined Route (Optional)
// ==============================
router.post("/", authenticateToken, invalidateCacheAfterSuccess(["Country", "State", "City"], { logLabel: "statecity-bulk-create" }), asyncHandler(createStateCity));
router.get("/", authenticateToken, asyncHandler(getAllStateCitys));

// ==============================
// 🌐 Public Location Data
// ==============================
router.get("/public/all", asyncHandler(getPublicLocationData));

export default router;
