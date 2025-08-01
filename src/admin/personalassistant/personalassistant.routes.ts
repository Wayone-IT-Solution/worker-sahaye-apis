import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { PersonalAssistantController } from "./personalassistant.controller";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  createPersonalAssistant,
  getAllPersonalAssistants,
  getPersonalAssistantById,
  updatePersonalAssistantById,
  deletePersonalAssistantById,
} = PersonalAssistantController;

const router = express.Router();

router
  .post("/",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "profileImageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("profile"),
    asyncHandler(createPersonalAssistant))
  .get("/", authenticateToken, isAdmin, asyncHandler(getAllPersonalAssistants))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getPersonalAssistantById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    dynamicUpload([{ name: "profileImageUrl", maxCount: 1 }]),
    s3UploaderMiddleware("profile"),
    asyncHandler(updatePersonalAssistantById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deletePersonalAssistantById))

export default router;
