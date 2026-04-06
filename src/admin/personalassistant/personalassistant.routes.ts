import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { PersonalAssistantController } from "./personalassistant.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";

const {
  createPersonalAssistant,
  getAllPersonalAssistants,
  getPersonalAssistantById,
  updatePersonalAssistantById,
  deletePersonalAssistantById,
  getPersonalAssistanceBenefits,
  bookPersonalAssistance,
  getDashboardOverview,
  getAssistantsWithSlots,
  getTodaySlots,
  getSlotsByDateRange,
  get7DaysSlots,
  get30DaysSlots,
  getTopSupportServices,
  getBookingStats,
} = PersonalAssistantController;

const router = express.Router();

// Get personal assistance benefits based on user's subscription plan (public, authenticated)
router.get("/benefits/my", authenticateToken, asyncHandler(getPersonalAssistanceBenefits));

// Book personal assistance with subscription-based pricing
router.post("/book/service", authenticateToken, asyncHandler(bookPersonalAssistance));

// Dashboard Analytics Routes
router.get(
  "/dashboard/overview",
  authenticateToken,
  isAdmin,
  asyncHandler(getDashboardOverview)
);

router.get(
  "/dashboard/assistants-with-slots",
  authenticateToken,
  isAdmin,
  asyncHandler(getAssistantsWithSlots)
);

router.get(
  "/dashboard/today-slots",
  authenticateToken,
  isAdmin,
  asyncHandler(getTodaySlots)
);

router.get(
  "/dashboard/slots-by-range",
  authenticateToken,
  isAdmin,
  asyncHandler(getSlotsByDateRange)
);

router.get(
  "/dashboard/7days-slots",
  authenticateToken,
  isAdmin,
  asyncHandler(get7DaysSlots)
);

router.get(
  "/dashboard/30days-slots",
  authenticateToken,
  isAdmin,
  asyncHandler(get30DaysSlots)
);

router.get(
  "/dashboard/top-services",
  authenticateToken,
  isAdmin,
  asyncHandler(getTopSupportServices)
);

router.get(
  "/dashboard/booking-stats",
  authenticateToken,
  isAdmin,
  asyncHandler(getBookingStats)
);

router
  .post(
    "/",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "profileImageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("profile"),
    asyncHandler(createPersonalAssistant)
  )
  .get("/", authenticateToken, isAdmin, asyncHandler(getAllPersonalAssistants))
  .get(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(getPersonalAssistantById)
  )
  .put(
    "/:id",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "profileImageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("profile"),
    asyncHandler(updatePersonalAssistantById)
  )
  .delete(
    "/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(deletePersonalAssistantById)
  );

export default router;
