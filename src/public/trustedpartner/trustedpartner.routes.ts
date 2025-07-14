import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { TrustedPartnerController } from "./trustedpartner.controller";
import { authenticateToken, isAdmin, isContractor } from "../../middlewares/authMiddleware";

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
    isContractor,
    asyncHandler(createTrustedPartner))
  .patch("/",
    authenticateToken,
    isContractor,
    asyncHandler(getTrustedPartnerDetails));

export default router;
