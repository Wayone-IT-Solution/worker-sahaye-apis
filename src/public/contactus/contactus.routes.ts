import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ContactUsController } from "./contactus.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createContactUs,
  getAllContactUs,
  getContactUsById,
  updateContactUsById,
  deleteContactUsById,
} = ContactUsController;

const router = express.Router();

router
  // Website form submit (no auth)
  .post("/", asyncHandler(createContactUs))
  // Admin panel
  .get("/", authenticateToken, isAdmin, asyncHandler(getAllContactUs))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getContactUsById))
  .put("/:id", authenticateToken, isAdmin, asyncHandler(updateContactUsById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteContactUsById));

export default router;

