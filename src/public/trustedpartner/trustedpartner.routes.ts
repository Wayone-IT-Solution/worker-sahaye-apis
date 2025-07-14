import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { TrustedPartnerController } from "./trustedpartner.controller";
import { allowAllExcept, authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createTrustedPartner,
  getAllTrustedPartners,
  getTrustedPartnerById,
  updateTrustedPartnerById,
  deleteTrustedPartnerById,
  getTrustedPartnerDetails
} = TrustedPartnerController;

const router = express.Router();

router
  .get("/",
    authenticateToken,
    isAdmin,
    asyncHandler(getAllTrustedPartners))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getTrustedPartnerById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateTrustedPartnerById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteTrustedPartnerById))
  .post("/",
    authenticateToken,
    allowAllExcept(["admin", "agent"] as any),
    asyncHandler(createTrustedPartner))
  .patch("/",
    authenticateToken,
    allowAllExcept(["admin", "agent"] as any),
    asyncHandler(getTrustedPartnerDetails));

export default router;
