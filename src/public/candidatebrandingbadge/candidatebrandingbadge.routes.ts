// Candidatebrandingbadge Routes
import express from "express";
import {
  createCandidatebrandingbadge,
  getAllCandidatebrandingbadges,
  getCandidatebrandingbadgeById,
  updateCandidatebrandingbadgeById,
  deleteCandidatebrandingbadgeById,
} from "./candidatebrandingbadge.controller";

const router = express.Router();

router
  .post("/", createCandidatebrandingbadge)
  .get("/", getAllCandidatebrandingbadges)
  .get("/:id", getCandidatebrandingbadgeById)
  .put("/:id", updateCandidatebrandingbadgeById)
  .delete("/:id", deleteCandidatebrandingbadgeById);

export default router;
