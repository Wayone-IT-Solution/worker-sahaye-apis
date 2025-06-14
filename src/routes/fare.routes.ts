import express from "express";
import {
  createFare,
  getAllFares,
  getFareById,
  updateFareById,
  deleteFareById,
} from "../controllers/fare.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

router.route("/").post(asyncHandler(createFare)).get(asyncHandler(getAllFares));

router
  .route("/:id")
  .get(asyncHandler(getFareById))
  .put(asyncHandler(updateFareById))
  .delete(asyncHandler(deleteFareById));

export default router;
