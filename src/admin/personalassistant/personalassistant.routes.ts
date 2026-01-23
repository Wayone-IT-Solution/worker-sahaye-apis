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
} = PersonalAssistantController;

const router = express.Router();

// Get personal assistance benefits based on user's subscription plan (public, authenticated)
router.get("/benefits/my", authenticateToken, asyncHandler(getPersonalAssistanceBenefits));

// Book personal assistance with subscription-based pricing
router.post("/book/service", authenticateToken, asyncHandler(bookPersonalAssistance));

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
